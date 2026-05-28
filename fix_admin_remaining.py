import re

with open('bot/whatsapp/commands/admin.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Remove getRewardBalance from import
content = content.replace(
    'getRewardBalance, getSessionUserId, getUserReferralCode, getReferralLeaderboard',
    'getSessionUserId, getUserReferralCode, getReferralLeaderboard'
)

# 2. Remove CASHOUT_THRESHOLD = 100 line
content = content.replace("const CASHOUT_THRESHOLD = 100;\n", '')

# 3. Remove handleBalance function
start = content.find('async function handleBalance(context: MessageContext, sock: any): Promise<void> {')
if start >= 0:
    brace_count = 0
    end = start
    for i in range(start, len(content)):
        if content[i] == '{':
            brace_count += 1
        elif content[i] == '}':
            brace_count -= 1
            if brace_count == 0:
                end = i + 1
                break
    content = content[:start] + content[end:]

# 4. Remove handleCashout function
start = content.find('async function handleCashout(context: MessageContext, args: string[], sock: any): Promise<void> {')
if start >= 0:
    brace_count = 0
    end = start
    for i in range(start, len(content)):
        if content[i] == '{':
            brace_count += 1
        elif content[i] == '}':
            brace_count -= 1
            if brace_count == 0:
                end = i + 1
                break
    content = content[:start] + content[end:]

# 5. Remove registerCommand line for balance
content = content.replace(
    "registerCommand({ name: 'balance', aliases: ['balance', 'bal', 'rewards'], category: 'admin', description: 'Check reward balance', execute: (ctx, _a, sock) => handleBalance(ctx, sock) });\n",
    ''
)

# 6. Remove registerCommand line for cashout
content = content.replace(
    "registerCommand({ name: 'cashout', aliases: ['cashout', 'withdraw', 'payout'], category: 'admin', description: 'Cash out reward balance (airtime or bank)', execute: (ctx, args, sock) => handleCashout(ctx, args, sock) });\n",
    ''
)

# Also fix the refer help text that mentions cashout
content = content.replace(
    '_Cash out at ₦100 for free airtime via !cashout_\n',
    ''
)

with open('bot/whatsapp/commands/admin.ts', 'w', encoding='utf-8') as f:
    f.write(content)

print('admin.ts updated successfully')

# Verify no more references
found = False
for line_num, line in enumerate(content.split('\n'), 1):
    if 'CASHOUT_THRESHOLD' in line or 'getRewardBalance' in line or 'handleBalance' in line or 'handleCashout' in line:
        print(f'  WARNING - still found at line {line_num}: {line.strip()[:80]}')
        found = True

if not found:
    print('  All references cleaned successfully!')