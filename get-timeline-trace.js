const fs = require('fs');
const cdp = require('chrome-remote-interface');
const chromelauncher = require('chrome-launcher');
const fetch = require('node-fetch');

const TRACE_CATEGORIES = ['-*', 'devtools.timeline', 'disabled-by-default-devtools.timeline', 'disabled-by-default-devtools.timeline.frame', 'toplevel', 'blink.user_timing', 'blink.console', 'disabled-by-default-devtools.timeline.stack', 'disabled-by-default-devtools.screenshot', 'disabled-by-default-v8.cpu_profile', 'disabled-by-default-v8.cpu_profiler', 'disabled-by-default-v8.cpu_profiler.hires'];

let rawEvents = [];

const sleep = n => new Promise(resolve => setTimeout(resolve, n));

const url = 'http://192.168.1.131:8065';

(async function() {
    const chrome = await chromelauncher.launch({port: 9222});
    const client = await cdp();
    const {Tracing, Page, Network} = client;

    // Set up user environment
    const response = await fetch(url + '/api/v4/users/login', {method: 'POST', body: JSON.stringify({login_id: 'jim@bladekick.com', password: 'test1234'})});
    const token = response.headers.get('Token');

    const user = await response.json();

    let complete = false;
    const filePrefix = 'profiles/profile-page-load-';
    fs.mkdirSync('profiles');

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

        if (complete) {
            await client.close();
            await chrome.kill();
        }
    });

    Tracing.dataCollected((data) => {
        var events = data.value;
        rawEvents = rawEvents.concat(events);
    });

    // Trace initial page load
    Page.enable();
    Tracing.start(tracingOptions);

    Page.navigate({url: url + '/billers/channels/start'});
    await sleep(10000); // 10 seconds should be enough for page load
    complete = true;
    Tracing.end();
})();
