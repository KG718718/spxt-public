'use strict';
// Hosted UI-component acceptance. Login endpoint below is deliberately synthetic,
// not the full application's authentication implementation. No production service.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const crypto = require('node:crypto');
if (process.env.GITHUB_ACTIONS !== 'true') {
    console.log('SKIP public login browser: hosted-only test');
} else {
    (async () => {
        const {chromium} = require('playwright-core');
        const {createBootstrapHandler} = require('../../public-bootstrap-http');
        const root = path.resolve(__dirname, '../..');
        const work = path.join(root, '.test-work');
        fs.mkdirSync(work, {recursive: true});
        const fixture = fs.mkdtempSync(path.join(work, 'login-browser-'));
        const evidence = path.join(work, 'login-browser-evidence');
        fs.mkdirSync(evidence); // Never overwrite earlier evidence.
        const dataFile = path.join(fixture, 'data.json');
        const html = fs.readFileSync(path.join(root, 'login.html'));
        const css = fs.readFileSync(path.join(root, 'k-session-theme.css'));
        let server, context, count = 0, setupPosts = 0, loginPosts = 0, loginSucceeds = false;
        const observed = [], exceptions = [], consoleMessages = [];
        const hash = () => crypto.createHash('sha256').update(fs.readFileSync(dataFile)).digest('hex');
        const check = async (name, fn) => { await fn(); count++; console.log('PASS ' + name); };
        const handler = createBootstrapHandler({
            dataFile, configFile: path.join(fixture, 'config.json'),
            priorFiles: [path.join(fixture, 'mail-reminder.config.json')],
            priorDirectories: [path.join(fixture, 'attachments'), path.join(fixture, 'backups')],
            getPort: () => server.address().port, onInitialized() {}
        });
        server = http.createServer((req, res) => {
            if (req.url === '/api/setup' && req.method === 'POST') setupPosts++;
            if (handler(req, res)) return;
            if (req.url === '/api/login' && req.method === 'POST') {
                loginPosts++; req.resume();
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify(loginSucceeds
                    ? {success: true, username: 'browser-admin-fixture', role: 'admin', token: 'synthetic-ui-only-token'}
                    : {success: false, error: '模拟登录拒绝：请核对账号和密码'}));
                return;
            }
            if (req.url === '/login.html' || req.url === '/') {
                res.writeHead(200, {'Content-Type': 'text/html; charset=utf-8'}); res.end(html); return;
            }
            if (req.url === '/k-session-theme.css') {
                res.writeHead(200, {'Content-Type': 'text/css; charset=utf-8'}); res.end(css); return;
            }
            if (req.url === '/approval.html') {
                res.writeHead(200, {'Content-Type': 'text/html; charset=utf-8'});
                res.end('<!doctype html><title>Synthetic landing</title><link rel="icon" href="data:,"><p>仅用于测试登录页面跳转，非业务页面。</p>'); return;
            }
            res.writeHead(404); res.end();
        });
        await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
        const origin = 'http://127.0.0.1:' + server.address().port;
        let failure;
        try {
            context = await chromium.launchPersistentContext(path.join(fixture, 'browser-profile'), {
                channel: 'msedge', headless: true, viewport: {width: 1440, height: 1000},
                acceptDownloads: false
            });
            const page = context.pages()[0] || await context.newPage();
            page.setDefaultTimeout(15000);
            page.on('pageerror', error => exceptions.push(error.message));
            page.on('console', message => {
                if (['warning', 'error'].includes(message.type()))
                    consoleMessages.push({type: message.type(), text: message.text(), url: message.location().url || ''});
            });
            async function contrast(selector) {
                const result = await page.locator(selector).evaluate(node => {
                    const rgb = text => (text.match(/[\d.]+/g) || []).slice(0, 3).map(Number);
                    const luminance = color => rgb(color).map(c => c / 255).map(c => c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4)
                        .reduce((sum, c, i) => sum + c * [.2126, .7152, .0722][i], 0);
                    const style = getComputedStyle(node);
                    let ancestor = node, background = style.backgroundColor;
                    while (background === 'rgba(0, 0, 0, 0)' && ancestor.parentElement) {
                        ancestor = ancestor.parentElement; background = getComputedStyle(ancestor).backgroundColor;
                    }
                    const a = luminance(style.color), b = luminance(background);
                    return {color: style.color, background, ratio: (Math.max(a, b) + .05) / (Math.min(a, b) + .05)};
                });
                observed.push({selector, ...result}); assert.ok(result.ratio >= 4.5, selector + ' contrast ' + result.ratio);
            }
            await page.goto(origin + '/login.html');
            await page.locator('#setupForm').waitFor({state: 'visible'});
            await check('fresh page exposes only installer-created Admin form', async () => {
                assert.equal(await page.locator('#loginForm').isVisible(), false);
                assert.equal(await page.locator('#setupUsername').inputValue(), '');
                assert.equal(await page.locator('#setupPassword').inputValue(), '');
                assert.equal(fs.existsSync(dataFile), false);
                assert.match(await page.title(), /K⁺-SESSION/);
            });
            await check('default labels, input and button have readable contrast', async () => {
                for (const selector of ['#pageTitle', '#setupUsername', '#setupSubmitButton', '#checkStateButton']) await contrast(selector);
            });
            await check('keyboard focus has a visible outline', async () => {
                await page.locator('#setupSubmitButton').focus();
                const style = await page.locator('#setupSubmitButton').evaluate(n => ({outline: getComputedStyle(n).outlineStyle, width: getComputedStyle(n).outlineWidth}));
                assert.notEqual(style.outline, 'none'); assert.ok(parseFloat(style.width) >= 2);
            });
            await page.screenshot({path: path.join(evidence, '01-first-install-desktop.png'), fullPage: true});
            await check('narrow viewport does not overflow horizontally', async () => {
                await page.setViewportSize({width: 390, height: 844});
                assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1));
                await page.screenshot({path: path.join(evidence, '02-first-install-narrow.png'), fullPage: true});
                await page.setViewportSize({width: 1440, height: 1000});
            });
            await page.locator('#setupUsername').fill('browser-admin-fixture');
            await page.locator('#setupPassword').fill('Synthetic-Browser-Secret-42');
            await page.locator('#setupConfirm').fill('Synthetic-Different-Secret-43');
            await page.locator('#setupSubmitButton').click();
            await check('mismatched password preserves inputs and sends no POST', async () => {
                assert.match(await page.locator('#message').innerText(), /两次密码不一致/);
                assert.equal(setupPosts, 0);
                assert.equal(await page.locator('#setupPassword').inputValue(), 'Synthetic-Browser-Secret-42');
                await contrast('#message');
            });
            await page.locator('#setupConfirm').fill('Synthetic-Browser-Secret-42');
            await page.route('**/api/setup', route => route.request().method() === 'POST' ? route.abort('failed') : route.continue());
            await page.locator('#setupSubmitButton').click();
            await page.locator('#message').filter({hasText: '未能确认创建结果'}).waitFor();
            await check('unconfirmed initialization is not retried or treated as successful', async () => {
                assert.equal(await page.locator('#setupForm').isVisible(), false);
                assert.equal(await page.locator('#loginForm').isVisible(), false);
                assert.equal(setupPosts, 0);
                assert.equal(fs.existsSync(dataFile), false);
            });
            await page.unroute('**/api/setup');
            await page.locator('#checkStateButton').click();
            await page.locator('#setupForm').waitFor({state: 'visible'});
            await page.route('**/api/setup', async route => {
                if (route.request().method() === 'POST') await new Promise(resolve => setTimeout(resolve, 1200));
                await route.continue();
            });
            await page.locator('#setupForm').evaluate(form => {
                form.dispatchEvent(new Event('submit', {bubbles: true, cancelable: true}));
                form.dispatchEvent(new Event('submit', {bubbles: true, cancelable: true}));
            });
            await check('pending submit disables repeat actions with readable labels', async () => {
                assert.equal(await page.locator('#setupSubmitButton').isDisabled(), true);
                assert.equal(await page.locator('#checkStateButton').isDisabled(), true);
                await contrast('#setupSubmitButton');
            });
            await page.locator('#loginForm').waitFor({state: 'visible'});
            await page.unroute('**/api/setup');
            await check('real bootstrap stores only one Admin and empty business tables', async () => {
                assert.equal(setupPosts, 1);
                const data = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
                assert.equal(data.users.length, 1); assert.equal(data.users[0].username, 'browser-admin-fixture');
                assert.match(data.users[0].password, /^pbkdf2-sha256\$/);
                for (const key of ['applications', 'payments', 'debts', 'suppliers', 'clients', 'invoices']) assert.deepEqual(data[key], []);
                assert.equal(await page.locator('#setupPassword').inputValue(), '');
                assert.equal(await page.locator('#setupConfirm').inputValue(), '');
                assert.equal(await page.evaluate(() => localStorage.getItem('token')), null);
                assert.match(await page.locator('#message').innerText(), /管理员已创建/);
            });
            const initializedHash = hash();
            await page.screenshot({path: path.join(evidence, '03-created-login.png'), fullPage: true});
            await page.reload();
            await page.locator('#loginForm').waitFor({state: 'visible'});
            await check('refresh does not reopen setup or change the saved data', async () => {
                assert.equal(await page.locator('#setupForm').isVisible(), false); assert.equal(hash(), initializedHash);
            });
            await page.locator('#username').fill('browser-admin-fixture');
            await page.locator('#password').fill('Synthetic-Browser-Secret-42');
            await page.locator('#loginSubmitButton').click();
            await page.locator('#message').filter({hasText: '模拟登录拒绝'}).waitFor();
            await check('synthetic rejected login keeps credentials for correction', async () => {
                assert.equal(await page.locator('#password').inputValue(), 'Synthetic-Browser-Secret-42');
                assert.equal(await page.locator('#loginSubmitButton').isEnabled(), true); assert.equal(loginPosts, 1);
            });
            loginSucceeds = true;
            await page.locator('#loginSubmitButton').click();
            await page.waitForURL(origin + '/approval.html');
            await check('synthetic successful login hands off existing session fields', async () => {
                const stored = await page.evaluate(() => ({username: localStorage.getItem('username'), role: localStorage.getItem('role'), token: localStorage.getItem('token')}));
                assert.deepEqual(stored, {username: 'browser-admin-fixture', role: 'admin', token: 'synthetic-ui-only-token'});
                assert.equal(hash(), initializedHash);
            });
            for (const [name, status, body, expected] of [
                ['service failure', 503, JSON.stringify({error: '合成服务状态异常，请检查服务'}), 'none'],
                ['malformed response', 200, 'not-json', 'none'],
                ['remote setup denied', 403, JSON.stringify({error: '本机操作限定'}), 'login']
            ]) {
                await page.route('**/api/setup', route => route.fulfill({status, contentType: 'application/json', body}));
                await page.goto(origin + '/login.html');
                await page.waitForFunction(() => !document.getElementById('checkStateButton').disabled);
                await check(name + ' is displayed without creating data', async () => {
                    assert.equal(await page.locator('#setupForm').isVisible(), false);
                    assert.equal(await page.locator('#loginForm').isVisible(), expected === 'login');
                    assert.equal(hash(), initializedHash); await contrast('#message');
                });
                if (status === 503) await page.screenshot({path: path.join(evidence, '04-service-error.png'), fullPage: true});
                await page.unroute('**/api/setup');
            }
            await check('page has no runtime exceptions or unexpected console errors', async () => {
                assert.deepEqual(exceptions, []);
                const unexpected = consoleMessages.filter(m => !(
                    /\/api\/setup$/.test(m.url) &&
                    /Failed to load resource: (the server responded with a status of (403|503)|net::ERR_FAILED)/.test(m.text)
                ));
                assert.deepEqual(unexpected, []);
            });
            console.log('Public login browser component checks: ' + count + ' passed');
        } catch (error) {
            failure = error;
            if (context) {
                try { await context.pages()[0]?.screenshot({path: path.join(evidence, 'failure.png'), fullPage: true}); } catch {}
            }
        } finally {
            fs.writeFileSync(path.join(evidence, 'report.json'), JSON.stringify({
                scope: 'public first-install/login UI component; synthetic login endpoint, not full application authentication',
                passed: count, success: !failure, error: failure?.message || null,
                browser: context?.browser()?.version() || 'runner Edge persistent context',
                contrast: observed, runtimeExceptions: exceptions, console: consoleMessages,
                screenshotsContainOnlySyntheticFixtures: true
            }, null, 2));
            if (context) await context.close();
            server.closeAllConnections();
            await new Promise(resolve => server.close(resolve));
        }
        if (failure) throw failure;
    })().catch(error => {console.error(error); process.exitCode = 1;});
}
