.PHONY: install run stop-docker clean

DOCKER_HOST := ''
ifeq ($(shell uname), Darwin)
	# workaround for chrome per https://github.com/moby/moby/issues/22753#issuecomment-282725489
	DOCKER_HOST = 192.168.65.1
else ifeq ($(shell uname), Linux)
	DOCKER_HOST = $(shell ip -4 addr show docker0 | grep -Po 'inet \K[\d.]+')
endif

install: .npminstall ## Installs dependencies
	@echo Installing dependencies

	@if [ $(shell docker images | grep -ci chrome-headless) -eq 0 ]; then \
		echo Pulling chrome-headless docker image; \
		docker pull justinribeiro/chrome-headless; \
	fi

	@echo Preloading MM database
	mysql --host=dockerhost --user=mmuser --password=mostest mattermost_test < db/testdbdump.sql

.npminstall: package.json
	@echo Getting dependencies using npm
	npm install
	touch $@

run: ## Runs the profiling
	@if [ $(shell docker ps -a | grep -ci profiling-chrome-headless) -eq 0 ]; then \
		echo Starting profiling-chrome-headless container; \
		docker run --name profiling-chrome-headless -d -p 9222:9222 --cap-add=SYS_ADMIN justinribeiro/chrome-headless; \
		sleep 5; \
	elif [ $(shell docker ps | grep -ci profiling-chrome-headless) -eq 0 ]; then \
		echo Restarting profiling-chrome-headless container; \
		docker start profiling-chrome-headless; \
		sleep 5; \
	fi

	@echo Starting profiling
	node get-timeline-trace.js 'http://$(DOCKER_HOST):8065'

stop-docker: ## Stops the docker container
	@echo Stopping docker containers
	docker stop profiling-chrome-headless

clean: stop-docker ## Cleans up docker containers and results
	@echo Cleaning up
	docker rm profiling-chrome-headless
	rm -rf ./profiles
