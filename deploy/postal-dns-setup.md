# Postal Email Server — DNS Configuration Guide

Reference for all DNS records required by Postal (v3.3.6) running on the BotWave VPS.

## Required DNS Records

All records below assume:
- **Server IP**: `144.91.107.59`
- **Postal hostname**: `postal.botwave.online`
- **DNS provider**: WhoGoHost (`nsa.whogohost.com`)

### Core Records

| Host | Type | Value | Purpose |
|------|------|-------|---------|
| `postal.botwave.online` | A | `144.91.107.59` | Postal web UI & SMTP |
| `mx.postal.botwave.online` | A | `144.91.107.59` | MX target for inbound mail |
| `rp.postal.botwave.online` | A | `144.91.107.59` | Return-path domain |
| `routes.postal.botwave.online` | MX | `10 postal.botwave.online` | Inbound routing |
| `track.postal.botwave.online` | A | `144.91.107.59` | Click/open tracking |

### SPF Records

| Host | Type | Value | Purpose |
|------|------|-------|---------|
| `botwave.online` | TXT | `v=spf1 ip4:144.91.107.59 include:spf.postal.botwave.online ~all` | Main SPF (ONE record only) |
| `spf.postal.botwave.online` | TXT | `v=spf1 ip4:144.91.107.59 ~all` | Postal SPF include |
| `rp.postal.botwave.online` | TXT | `v=spf1 ip4:144.91.107.59 ~all` | Return-path SPF |
| `postal.botwave.online` | TXT | `v=spf1 ip4:144.91.107.59 ~all` | HELO hostname SPF |

> **Important**: Only ONE `v=spf1` TXT record per domain. Multiple SPF records cause RFC 7208 PermError.

### MX Records

| Host | Type | Value | Purpose |
|------|------|-------|---------|
| `botwave.online` | MX | `10 mx.postal.botwave.online` | Inbound mail |
| `rp.postal.botwave.online` | MX | `10 postal.botwave.online` | Return-path bounce handling |
| `routes.postal.botwave.online` | MX | `10 postal.botwave.online` | Postal inbound routing |

### DMARC Record

| Host | Type | Value |
|------|------|-------|
| `_dmarc.botwave.online` | TXT | `v=DMARC1; p=quarantine; rua=mailto:dmarc@botwave.online` |

### DKIM Records (Per-Domain)

Each domain configured in Postal gets a unique DKIM selector. The selector format is `postal-<identifier>._domainkey.<domain>`. Each selector MUST have exactly ONE TXT record.

Current selectors (from Postal database):

| Domain | DKIM Selector | DNS Host |
|--------|---------------|----------|
| `botwave.online` | `HdhWIF` | `postal-HdhWIF._domainkey.botwave.online` |
| `auth.botwave.online` | `PnpbrF` | `postal-PnpbrF._domainkey.auth.botwave.online` |
| `notify.botwave.online` | `t0B1Aj` | `postal-t0B1Aj._domainkey.notify.botwave.online` |
| `billing.botwave.online` | `a9DXMs` | `postal-a9DXMs._domainkey.billing.botwave.online` |
| `welcome.botwave.online` | `ZaMXKR` | `postal-ZaMXKR._domainkey.welcome.botwave.online` |
| `mail.botwave.online` | `tyc9Pj` | `postal-tyc9Pj._domainkey.mail.botwave.online` |

To get the DKIM public key for each domain, open the Postal web UI at https://postal.botwave.online and navigate to the domain's DNS settings. Or query the database:

```bash
docker exec postal-mariadb mariadb -uroot -ppostal postal \
  -e "SELECT name, dkim_identifier_string, dkim_status FROM domains;"
```

### Reverse DNS (PTR)

Set via **Contabo** control panel (not WhoGoHost):

| IP | PTR Value |
|----|-----------|
| `144.91.107.59` | `postal.botwave.online` |
| `2a02:c207:2328:9065::1` | `postal.botwave.online` |

## Verification Commands

```bash
# Check SPF
dig +short botwave.online TXT | grep spf

# Check DKIM (replace selector)
dig +short postal-HdhWIF._domainkey.botwave.online TXT

# Check DMARC
dig +short _dmarc.botwave.online TXT

# Check reverse DNS
dig +short -x 144.91.107.59

# Check MX
dig +short botwave.online MX

# Trigger Postal DNS recheck
docker exec -it postal-web-1 postal console
# In console: Domain.all.each { |d| d.check_dns; d.save }; exit
```

## Postal Configuration Reference

Config file: `/opt/postal/config/postal.yml`

```yaml
dns:
  mx_records:
    - mx.postal.botwave.online
  spf_include: spf.postal.botwave.online
  return_path_domain: rp.postal.botwave.online
  route_domain: routes.postal.botwave.online
  track_domain: track.postal.botwave.online
```

## Testing

After making DNS changes, wait 5-15 minutes for propagation, then:

1. Send a test email from Postal:
   ```bash
   docker exec -it postal-web-1 postal test-app-smtp
   ```
2. Check results at https://www.mail-tester.com
3. Verify DKIM at https://mxtoolbox.com/dkim.aspx
4. Verify SPF at https://mxtoolbox.com/spf.aspx
