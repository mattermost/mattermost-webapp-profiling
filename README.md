# mattermost-webapp-profiling

Project for automated profiling of the [Mattermost web app](https://github.com/mattermost/mattermost-webapp). Built off the wonderful [automated-chrome-profiling](https://github.com/paulirish/automated-chrome-profiling).

## Requirements

1. [npm](https://www.npmjs.com/) 4.3.0 or higher
2. [node](https://nodejs.org/en/) 7.7.0 or higher
3. [mattermost-server](https://github.com/mattermost/mattermost-server) and [mattermost-webapp](https://github.com/mattermost/mattermost-webapp) developer environments

## Usage

1. Run `make install`
2. Load the db/testdbdump.sql into your mysql database
3. Start up your Mattermost server at http://localhost:8065
4. Run `make run`
5. Open up Chrome and load the profile created in `./profiles/` into the Performance tab

Use `make clean` to clean up the docker container and your environment.

## Reading the Profile

In the timeline you should see three yellow blocks representing CPU usage. The first covers initial page load, the second is a channel switch and the last is a team switch. Let's call each of these an event.

Open up the User Timing tab to see React specific information in the form of a [flame graph](http://www.brendangregg.com/flamegraphs.html). This should provide insight into where processing time is being spent for each of the three different events.

