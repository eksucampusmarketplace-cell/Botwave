/**
 * Info lookup handler: /crypto, /ip, /whois, /dns, /weather, /ud (urban dictionary)
 * Uses free public APIs for data lookups.
 */

import { Bot } from 'grammy';
import { escapeHtml } from '../utils/format';

export function registerInfoLookupHandlers(bot: Bot, _sessionId: string): void {
  bot.command('crypto', async (ctx) => {
    const coin = (ctx.match?.toString() || '').trim().toLowerCase() || 'bitcoin';
    try {
      const res = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(coin)}&vs_currencies=usd,eur,gbp&include_24hr_change=true&include_market_cap=true`);
      if (!res.ok) throw new Error('API error');
      const data = await res.json() as Record<string, any>;
      const info = data[coin];
      if (!info) {
        await ctx.reply(`❌ Coin "${escapeHtml(coin)}" not found.\n\nTry: /crypto bitcoin, /crypto ethereum, /crypto solana`);
        return;
      }
      const change = info.usd_24h_change ? `${info.usd_24h_change > 0 ? '📈 +' : '📉 '}${info.usd_24h_change.toFixed(2)}%` : 'N/A';
      const mcap = info.usd_market_cap ? `$${(info.usd_market_cap / 1e9).toFixed(2)}B` : 'N/A';
      await ctx.reply(
        `💰 <b>${escapeHtml(coin.charAt(0).toUpperCase() + coin.slice(1))}</b>\n\n` +
        `USD: $${info.usd?.toLocaleString() || 'N/A'}\n` +
        `EUR: €${info.eur?.toLocaleString() || 'N/A'}\n` +
        `GBP: £${info.gbp?.toLocaleString() || 'N/A'}\n\n` +
        `24h Change: ${change}\n` +
        `Market Cap: ${mcap}`,
        { parse_mode: 'HTML' },
      );
    } catch {
      await ctx.reply('❌ Failed to fetch crypto data. Try again later.\n\nUsage: /crypto <coin_id>\nExample: /crypto bitcoin');
    }
  });

  bot.command('ip', async (ctx) => {
    const ip = (ctx.match?.toString() || '').trim();
    if (!ip) {
      await ctx.reply('Usage: /ip <address>\nExample: /ip 8.8.8.8');
      return;
    }
    if (!/^[\d.a-fA-F:]+$/.test(ip)) {
      await ctx.reply('❌ Invalid IP address format.');
      return;
    }
    try {
      const res = await fetch(`http://ip-api.com/json/${ip}?fields=status,message,country,regionName,city,zip,lat,lon,timezone,isp,org,as,query`);
      const data = await res.json() as Record<string, any>;
      if (data.status === 'fail') {
        await ctx.reply(`❌ ${data.message || 'Invalid IP address.'}`);
        return;
      }
      await ctx.reply(
        `🌐 <b>IP Lookup: ${escapeHtml(data.query)}</b>\n\n` +
        `Country: ${data.country || 'N/A'}\n` +
        `Region: ${data.regionName || 'N/A'}\n` +
        `City: ${data.city || 'N/A'}\n` +
        `ZIP: ${data.zip || 'N/A'}\n` +
        `Lat/Lon: ${data.lat}, ${data.lon}\n` +
        `Timezone: ${data.timezone || 'N/A'}\n` +
        `ISP: ${escapeHtml(data.isp || 'N/A')}\n` +
        `Org: ${escapeHtml(data.org || 'N/A')}\n` +
        `AS: ${escapeHtml(data.as || 'N/A')}`,
        { parse_mode: 'HTML' },
      );
    } catch {
      await ctx.reply('❌ Failed to fetch IP data.');
    }
  });

  bot.command('whois', async (ctx) => {
    const domain = (ctx.match?.toString() || '').trim().toLowerCase();
    if (!domain) {
      await ctx.reply('Usage: /whois <domain>\nExample: /whois google.com');
      return;
    }
    if (!/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(domain)) {
      await ctx.reply('❌ Invalid domain format.');
      return;
    }
    try {
      const res = await fetch(`https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=A`);
      const data = await res.json() as Record<string, any>;
      let msg = `🔍 <b>WHOIS: ${escapeHtml(domain)}</b>\n\n`;
      if (data.Answer && data.Answer.length > 0) {
        msg += `<b>DNS Records:</b>\n`;
        for (const record of data.Answer.slice(0, 10)) {
          msg += `${record.name} → ${record.data} (TTL: ${record.TTL}s)\n`;
        }
      } else {
        msg += 'No DNS records found.\n';
      }
      msg += `\nStatus: ${data.Status === 0 ? '✅ NOERROR' : '❌ Error ' + data.Status}`;
      await ctx.reply(msg, { parse_mode: 'HTML' });
    } catch {
      await ctx.reply('❌ Failed to fetch WHOIS data.');
    }
  });

  bot.command('dns', async (ctx) => {
    const args = (ctx.match?.toString() || '').trim().split(/\s+/);
    const domain = args[0]?.toLowerCase();
    const type = (args[1] || 'A').toUpperCase();
    if (!domain) {
      await ctx.reply('Usage: /dns <domain> [type]\nExample: /dns google.com MX\n\nTypes: A, AAAA, MX, NS, TXT, CNAME, SOA');
      return;
    }
    try {
      const res = await fetch(`https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=${type}`);
      const data = await res.json() as Record<string, any>;
      let msg = `🔍 <b>DNS: ${escapeHtml(domain)} (${type})</b>\n\n`;
      if (data.Answer && data.Answer.length > 0) {
        for (const record of data.Answer.slice(0, 15)) {
          msg += `<code>${escapeHtml(record.data)}</code> (TTL: ${record.TTL}s)\n`;
        }
      } else {
        msg += 'No records found.';
      }
      await ctx.reply(msg, { parse_mode: 'HTML' });
    } catch {
      await ctx.reply('❌ Failed to fetch DNS records.');
    }
  });

  bot.command('ud', async (ctx) => {
    const term = (ctx.match?.toString() || '').trim();
    if (!term) {
      await ctx.reply('Usage: /ud <word>\nLook up a word on Urban Dictionary.');
      return;
    }
    try {
      const res = await fetch(`https://api.urbandictionary.com/v0/define?term=${encodeURIComponent(term)}`);
      const data = await res.json() as { list: Array<{ definition: string; example: string; thumbs_up: number; thumbs_down: number; word: string }> };
      if (!data.list || data.list.length === 0) {
        await ctx.reply(`❌ No definition found for "${escapeHtml(term)}".`);
        return;
      }
      const entry = data.list[0];
      const def = entry.definition.replace(/\[|\]/g, '').slice(0, 1000);
      const example = entry.example?.replace(/\[|\]/g, '').slice(0, 500) || '';
      await ctx.reply(
        `📖 <b>${escapeHtml(entry.word)}</b>\n\n` +
        `${escapeHtml(def)}\n\n` +
        (example ? `<i>Example: ${escapeHtml(example)}</i>\n\n` : '') +
        `👍 ${entry.thumbs_up} | 👎 ${entry.thumbs_down}`,
        { parse_mode: 'HTML' },
      );
    } catch {
      await ctx.reply('❌ Failed to fetch definition.');
    }
  });

  bot.command('weather', async (ctx) => {
    const city = (ctx.match?.toString() || '').trim();
    if (!city) {
      await ctx.reply('Usage: /weather <city>\nExample: /weather London');
      return;
    }
    try {
      const res = await fetch(`https://wttr.in/${encodeURIComponent(city)}?format=j1`);
      if (!res.ok) throw new Error('not found');
      const data = await res.json() as any;
      const current = data.current_condition?.[0];
      const area = data.nearest_area?.[0];
      if (!current) throw new Error('no data');

      const areaName = area?.areaName?.[0]?.value || city;
      const country = area?.country?.[0]?.value || '';

      await ctx.reply(
        `🌤️ <b>Weather: ${escapeHtml(areaName)}${country ? ', ' + escapeHtml(country) : ''}</b>\n\n` +
        `🌡️ Temperature: ${current.temp_C}°C (${current.temp_F}°F)\n` +
        `🤔 Feels like: ${current.FeelsLikeC}°C\n` +
        `💧 Humidity: ${current.humidity}%\n` +
        `💨 Wind: ${current.windspeedKmph} km/h ${current.winddir16Point}\n` +
        `☁️ Cloud cover: ${current.cloudcover}%\n` +
        `👁️ Visibility: ${current.visibility} km\n` +
        `🌤️ ${current.weatherDesc?.[0]?.value || 'N/A'}`,
        { parse_mode: 'HTML' },
      );
    } catch {
      await ctx.reply(`❌ Could not find weather for "${escapeHtml(city)}".`);
    }
  });

  bot.command('npm', async (ctx) => {
    const pkg = (ctx.match?.toString() || '').trim();
    if (!pkg) {
      await ctx.reply('Usage: /npm <package_name>\nLook up an npm package.');
      return;
    }
    try {
      const res = await fetch(`https://registry.npmjs.org/${encodeURIComponent(pkg)}`);
      if (!res.ok) throw new Error('not found');
      const data = await res.json() as any;
      const latest = data['dist-tags']?.latest || 'N/A';
      const desc = data.description || 'No description';
      const license = data.license || 'N/A';
      const homepage = data.homepage || '';
      await ctx.reply(
        `📦 <b>${escapeHtml(data.name || pkg)}</b>\n\n` +
        `Version: ${latest}\n` +
        `License: ${license}\n` +
        `${escapeHtml(desc.slice(0, 300))}\n\n` +
        (homepage ? `🔗 ${escapeHtml(homepage)}\n` : '') +
        `npm: https://www.npmjs.com/package/${encodeURIComponent(pkg)}`,
        { parse_mode: 'HTML' },
      );
    } catch {
      await ctx.reply(`❌ Package "${escapeHtml(pkg)}" not found on npm.`);
    }
  });

  bot.command('country', async (ctx) => {
    const name = (ctx.match?.toString() || '').trim();
    if (!name) {
      await ctx.reply('Usage: /country <name>\nExample: /country Japan');
      return;
    }
    try {
      const res = await fetch(`https://restcountries.com/v3.1/name/${encodeURIComponent(name)}?fields=name,capital,population,region,subregion,currencies,languages,timezones,flags`);
      if (!res.ok) throw new Error('not found');
      const data = await res.json() as any[];
      if (!data || data.length === 0) throw new Error('empty');
      const c = data[0];
      const currencies = c.currencies ? Object.values(c.currencies).map((cur: any) => `${cur.name} (${cur.symbol})`).join(', ') : 'N/A';
      const languages = c.languages ? Object.values(c.languages).join(', ') : 'N/A';
      await ctx.reply(
        `🌍 <b>${escapeHtml(c.name?.common || name)}</b>\n\n` +
        `Official: ${escapeHtml(c.name?.official || 'N/A')}\n` +
        `Capital: ${c.capital?.join(', ') || 'N/A'}\n` +
        `Region: ${c.region || 'N/A'} / ${c.subregion || 'N/A'}\n` +
        `Population: ${c.population?.toLocaleString() || 'N/A'}\n` +
        `Currencies: ${escapeHtml(currencies)}\n` +
        `Languages: ${escapeHtml(languages)}\n` +
        `Timezones: ${(c.timezones || []).slice(0, 5).join(', ')}` +
        (c.flags?.emoji ? `\n\nFlag: ${c.flags.emoji}` : ''),
        { parse_mode: 'HTML' },
      );
    } catch {
      await ctx.reply(`❌ Country "${escapeHtml(name)}" not found.`);
    }
  });
}
