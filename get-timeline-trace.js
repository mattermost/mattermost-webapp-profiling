const fs = require('fs');
const cdp = require('chrome-remote-interface');
const chromelauncher = require('chrome-launcher');
const fetch = require('node-fetch');

const TRACE_CATEGORIES = ['-*', 'devtools.timeline', 'disabled-by-default-devtools.timeline', 'disabled-by-default-devtools.timeline.frame', 'toplevel', 'blink.user_timing', 'blink.console', 'disabled-by-default-devtools.timeline.stack', 'disabled-by-default-devtools.screenshot', 'disabled-by-default-v8.cpu_profile', 'disabled-by-default-v8.cpu_profiler', 'disabled-by-default-v8.cpu_profiler.hires'];

let rawEvents = [];

const sleep = n => new Promise(resolve => setTimeout(resolve, n));

const url = process.argv[2];

(async function() {
    if (url == null) {
        console.error('Must provide dockerhost URL as an argument. Easier to just use `make run`.'); //eslint-disable-line no-console
        process.exit(1);
    }

    const chrome = await chromelauncher.launch({port: 9222});
    const client = await cdp();
    const {Tracing, Page, Network, Runtime} = client;

    // Set up user environment
    const response = await fetch('http://localhost:8065/api/v4/users/login', {method: 'POST', body: JSON.stringify({login_id: 'test@test.com', password: 'test1234'})});
    const token = response.headers.get('Token');

    const user = await response.json();

    const filePrefix = 'profiles/profile-page-load-';
    try {
        fs.mkdirSync('profiles');
    } catch (err) {
        // do nothing
    }

    Network.setCookie(
        {
            name: 'MMAUTHTOKEN',
            value: token,
            url,
            httpOnly: true
        }
    );

    Network.setCookie(
        {
            name: 'MMUSERID',
            value: user.id,
            url,
            httpOnly: false
        }
    );

    // Set up tracing
    const tracingOptions = {
        categories: TRACE_CATEGORIES.join(','),
        options: 'sampling-frequency=10000'  // 1000 is default and too slow.
    };

    Tracing.tracingComplete(async () => {
        const file = filePrefix + Date.now() + '.devtools.trace';
        fs.writeFileSync(file, JSON.stringify(rawEvents, null, 2));
        console.log('Trace file: ' + file); //eslint-disable-line no-console
        console.log('You can open the trace file in DevTools Performance panel.\n'); //eslint-disable-line no-console

        await client.close();
        await chrome.kill();
        process.exit();
    });

    Tracing.dataCollected((data) => {
        var events = data.value;
        rawEvents = rawEvents.concat(events);
    });

    // Trace initial page load
    Page.enable();
    Tracing.start(tracingOptions);

    Page.navigate({url: url + '/testteam/channels/start'});
    await sleep(5000);

    // Trace channel switch
    await Runtime.evaluate({
        expression: `
            var el = document.querySelector('a[href="/testteam/channels/end"]');
            el.click();
        `
    });

    await sleep(5000);

    // Trace team switch
    await Runtime.evaluate({
        expression: `
            var el = document.querySelector('a[href="/testteam2"]');
            el.click();
        `
    });
    await sleep(5000);
    Tracing.end();
})();
