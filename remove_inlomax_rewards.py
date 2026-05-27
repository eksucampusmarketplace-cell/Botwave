#!/usr/bin/env python3
"""
BotWave - Remove all inlomax VTU API and reward system code.

This script removes:
1. bot/whatsapp/utils/inlomax.ts (the entire VTU API client)
2. ALL creditReward() calls in bot/BotManager.ts
3. The entire REWARD_ACTIONS/section in bot/database.ts
4. checkAndCashout() function
5. getRewardBalance() function
6. inlomax references in app/api/diagnostics/route.ts
7. Reward dashboard: app/dashboard/rewards/ page (delete directory)
8. Reward link from app/dashboard/page.tsx sidebar
9. Reward references in app/api/user/subscription/route.ts
10. Reward references in app/api/admin/monetization/route.ts
11. verify-email referral reward code
"""

import os
import re
import sys
import shutil

REPO = '/root/Botwave'

def read(fn):
    with open(os.path.join(REPO, fn), 'r') as f:
        return f.read()

def write(fn, content):
    with open(os.path.join(REPO, fn), 'w') as f:
        f.write(content)

def ok(msg):
    print(f'  [OK] {msg}')

# ── 1. Delete inlomax.ts ──────────────────────────────────────────
fn = 'bot/whatsapp/utils/inlomax.ts'
fp = os.path.join(REPO, fn)
if os.path.exists(fp):
    os.remove(fp)
    ok(f'Deleted {fn}')
else:
    ok(f'{fn} already gone')

# ── 2. Remove creditReward imports and calls from BotManager.ts ──
content = read('bot/BotManager.ts')

# Remove creditReward from import line - clean up any trailing comma/before-comma
content = re.sub(r',\s*creditReward', '', content)
content = re.sub(r'creditReward,\s*', '', content)

# Remove ALL creditReward() void call patterns
for pat in [
    r'\s*void\s+creditReward\([^)]+\)\s*\.catch\(\(\)\s*=>\s*\{\}\)\s*;?',
    r'\s*void\s+creditReward\([^)]+\)\s*;?',
    r'\s*creditReward\([^)]+\)\s*;?',
]:
    content = re.sub(pat, '', content)

# Clean up double-blank lines
content = re.sub(r'\n\n\n+', '\n\n', content)

write('bot/BotManager.ts', content)
ok('Removed creditReward imports and calls from BotManager.ts')

# ── 3. Remove reward system from database.ts ─────────────────────
content = read('bot/database.ts')

# Remove the entire rewards section between section markers
lines = content.split('\n')
new_lines = []
in_reward_section = False
for line in lines:
    if '// ─── Monetization: Rewards' in line:
        in_reward_section = True
        continue
    if in_reward_section and line.strip().startswith('// ───') and 'Monetization' not in line:
        in_reward_section = False
        new_lines.append(line)
        continue
    if in_reward_section:
        continue
    new_lines.append(line)

content = '\n'.join(new_lines)

# Remove rewardBalanceCache Map declaration
content = re.sub(r'^\s*const\s+rewardBalanceCache\s*=\s*new\s+Map<[^>]+>\(\)\s*;?\s*\n?', '', content, flags=re.MULTILINE)

# Remove invalidateApiRewards function
content = re.sub(r'export\s+async\s+function\s+invalidateApiRewards\s*\([^)]*\)\s*\{[^}]*\}', '', content)

# Clean up empty {} import
content = re.sub(r',\s*}', '}', content)
content = re.sub(r'{\s*}', '{}', content)

write('bot/database.ts', content)
ok('Removed reward system from database.ts')

# ── 4. Remove inlomax from diagnostics route ─────────────────────
content = read('app/api/diagnostics/route.ts')

# Remove inlomax balance check block
content = re.sub(r'\n\s*const inlomaxKey = process\.env\.INLOMAX_API_KEY;[\s\S]*?if \(inlomaxKey\) \{[\s\S]*?\n  \}', '', content)

# Remove reward_balances and reward_transactions from table list
content = content.replace("'reward_balances',", '')
content = content.replace("'reward_transactions',", '')

write('app/api/diagnostics/route.ts', content)
ok('Removed inlomax from diagnostics route')

# ── 5. Delete rewards dashboard page ─────────────────────────────
rewards_dir = os.path.join(REPO, 'app/dashboard/rewards')
if os.path.exists(rewards_dir):
    shutil.rmtree(rewards_dir)
    ok('Deleted app/dashboard/rewards/ directory')
else:
    ok('app/dashboard/rewards/ already gone')

# ── 6. Remove reward link from dashboard sidebar ────────────────
content = read('app/dashboard/page.tsx')

# Remove the rewards nav item
content = re.sub(
    r",?\s*\{ href: '/dashboard/rewards', icon: '[^']*', label: 'Rewards', platforms: \[[^\]]*\] \}",
    '',
    content
)

write('app/dashboard/page.tsx', content)
ok('Removed Rewards link from dashboard sidebar')

# ── 7. Remove referral reward code from verify-email route ──────
content = read('app/api/auth/verify-email/route.ts')

# Remove the increment_reward_balance blocks
content = re.sub(
    r'\s+const \{ error: rpcErr1 \} = await supabase\.rpc\(\'increment_reward_balance\', \{ p_user_id: referral\.user_id, p_amount: REFERRAL_REWARD \}\);[\s\S]*?\}',
    '',
    content
)
content = re.sub(
    r'\s+const \{ error: rpcErr2 \} = await supabase\.rpc\(\'increment_reward_balance\', \{ p_user_id: data\.user\.id, p_amount: REFERRED_REWARD \});[\s\S]*?\}',
    '',
    content
)
# Remove REFERRAL_REWARD and REFERRED_REWARD constants
content = re.sub(r'^const REFERRAL_REWARD = \d+;?\n?', '', content, flags=re.MULTILINE)
content = re.sub(r'^const REFERRED_REWARD = \d+;?\n?', '', content, flags=re.MULTILINE)

write('app/api/auth/verify-email/route.ts', content)
ok('Removed referral reward code from verify-email route')

# ── 8. Remove reward references from user subscription API ───────
content = read('app/api/user/subscription/route.ts')
content = content.replace(', rewards', '')
content = content.replace('rewards: rewardData,', '')
content = content.replace('rewards: null,', '')
write('app/api/user/subscription/route.ts', content)
ok('Removed rewards from subscription route')

# ── 9. Remove reward_balances, airtime_cashouts from admin monetization ──
content = read('app/api/admin/monetization/route.ts')
# Remove the reward_balances block (from .from('reward_balances') to its semicolon)
content = re.sub(r"\s*\.from\('reward_balances'\)[\s\S]*?;", '', content)
# Remove the airtime_cashouts block
content = re.sub(r"\s*\.from\('airtime_cashouts'\)[\s\S]*?;", '', content)
write('app/api/admin/monetization/route.ts', content)
ok('Removed reward tables from admin monetization route')

# ── 10. Verify no remaining references ─────────────────────────
remaining = []
for root, dirs, files in os.walk(REPO):
    for f in files:
        if not (f.endswith('.ts') or f.endswith('.tsx')):
            continue
        fp = os.path.join(root, f)
        rel = os.path.relpath(fp, REPO)
        try:
            with open(fp) as fh:
                for i, line in enumerate(fh, 1):
                    if 'inlomax' in line.lower() or 'creditReward' in line or 'checkAndCashout' in line or 'rewardBalanceCache' in line:
                        remaining.append(f'{rel}:{i}: {line.strip()[:100]}')
        except:
            pass

if remaining:
    print()
    print('=== WARNING: Remaining references found ===')
    for r in remaining:
        print(f'  {r}')
else:
    print()
    print('=== NO REMAINING REFERENCES - all clean ===')

print()
print('=== ALL REMOVALS COMPLETE ===')
print()

# ── 11. Git add / commit / push ──────────────────────────────────
os.chdir(REPO)
os.system('git add -A')
os.system('git commit -m "Remove inlomax VTU API and reward system"')
os.system('git push origin BotWave')