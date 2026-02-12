const inquirer = require('inquirer');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

console.clear();

const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    green: '\x1b[32m',
    cyan: '\x1b[36m',
    yellow: '\x1b[33m',
    magenta: '\x1b[35m',
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

function header(text) {
    console.log();
    log('═'.repeat(70), 'cyan');
    log(`  ${text}`, 'bright');
    log('═'.repeat(70), 'cyan');
    console.log();
}

async function runScript(scriptName) {
    return new Promise((resolve) => {
        const scriptPath = path.join(__dirname, 'src', scriptName);
        const child = spawn('node', [scriptPath], { stdio: 'inherit' });

        child.on('close', (code) => {
            resolve(code);
        });
    });
}

async function start() {
    header('🛠️  BlueCollarClaw Control Center');

    // Check if setup is done
    const setupDone = fs.existsSync(path.join(__dirname, 'my-BlueCollarClaw-config.txt'));

    if (!setupDone) {
        log('  👋 Welcome! It looks like you haven\'t set up yet.', 'yellow');
        log('  Let\'s get you started.', 'cyan');
        console.log();
        await runScript('easy-setup.js');
        console.clear();
        header('🛠️  BlueCollarClaw Control Center');
    }

    // Determine user role from config
    const config = fs.readFileSync(path.join(__dirname, 'my-BlueCollarClaw-config.txt'), 'utf8');
    const isClient = config.includes('ROLE=GC') || config.includes('ROLE=HOMEOWNER');

    const choices = [];

    if (isClient) {
        choices.push({ name: '📢 Post a New Job', value: 'post-job.js' });
        choices.push({ name: '📊 View Dashboard (Manage Jobs)', value: 'server.js' });
    } else {
        choices.push({ name: '💓 Daily Briefing (Pulse Check)', value: 'pulse-check/pulse.js' });
        choices.push({ name: '📊 View Dashboard (Find Work)', value: 'server.js' });
    }

    choices.push(new inquirer.Separator());
    choices.push({ name: '⚙️  Re-run Setup', value: 'easy-setup.js' });
    choices.push({ name: '❓ How It Works', value: 'readme' });
    choices.push({ name: '❌ Exit', value: 'exit' });

    const { action } = await inquirer.prompt([
        {
            type: 'list',
            name: 'action',
            message: 'What would you like to do?',
            choices,
        },
    ]);

    if (action === 'exit') {
        process.exit(0);
    } else if (action === 'readme') {
        console.log();
        log(fs.readFileSync(path.join(__dirname, 'HOW_IT_WORKS.md'), 'utf8'), 'cyan');
        await inquirer.prompt([{ type: 'input', name: 'continue', message: 'Press Enter to continue...' }]);
        start(); // Loop back
    } else {
        await runScript(action);
        await inquirer.prompt([{ type: 'input', name: 'continue', message: 'Press Enter to continue...' }]);
        start(); // Loop back
    }
}

// Check for inquirer dependency
try {
    require.resolve('inquirer');
    start();
} catch (e) {
    log('  📦 Installing dependencies for the menu...', 'yellow');
    const child = spawn('npm', ['install', 'inquirer'], { stdio: 'inherit', shell: true });
    child.on('close', () => {
        console.clear();
        start();
    });
}
