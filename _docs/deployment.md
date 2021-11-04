# Deployment

How to get this stack up and running.

## System Requirements

Any Linux server distribution will do, with the following requirements:

- 4 GiB of RAM is recommended. If there is too little memory available, ElasticSearch becomes surprisingly unresponsive.
- A recent version of Docker and `docker-compose` must be installed. Follow [the official Docker installation guides](https://docs.docker.com/engine/install/) if in doubt.
- This stack only listens on a local port. To expose it to the internet, an external reverse proxy or load balancer is required - check `/_docs/components.md` for more details and an nginx example config.

For local testing, macOS with Docker Desktop is also supported.

## Preparation

1. Clone this repository into a directory on the server. This guide assumes it will be installed into `/srv/web-bugs-analysis`, but you're free to choose whatever you want to. `git clone https://github.com/webcompat/web-bugs-analysis /srv/`
2. Pre-fetch external images with `docker-compose pull`.
3. Build our custom Docker images with `docker-compose build`.
4. Copy the example configs:
   1. `cp config/environment.example config/environment`
   2. `cp config/htpasswd-data.example config/htpasswd-data`
   3. `cp config/kibana.example config/kibana`
5. Set up the external load balancer now - you will need access to the web interface in a bit. If you're setting this stack up locally on your own machine, you can skip this step.

### Initial configuration

Before we can get started, we need to do some initial configuration. **Not all available values will be set at this time**, and this is fine. Some things will be adjusted later.

- In `config/environment`, change the following parameters:
  - `GITHUB_PERSONAL_ACCESS_TOKEN`: This has to be a GitHub Personal Access Token. The token needs the full `repo` permission, including all sub-permissions.
  - Make sure `GITHUB_ORG`, `GITHUB_REPO_PRIVATE`, and `GITHUB_REPO_PUBLIC` are set to the right GitHub org and repos.
- In `config/kibana`, change the following parameters:
  - `SERVER_PUBLICBASEURL`: This needs to be the public address the application will be available on. The path is always `/kibana` and cannot be changed, so only change the domain. If you're setting this up on a local machine, set this to `http://localhost:8080/kibana`.

## Turning It On

Let's get things going.

### Step 1: ElasticSearch

As the first step, start only ElasticSearch:

```
docker-compose up elasticsearch -d
```

Wait 5 minutes. Seriously. Get a coffee or something, just give it a little bit of time. :) When you enjoyed your lovely cup of coffee and/or tea, start the password generation process with

```
docker-compose exec elasticsearch ./bin/elasticsearch-setup-passwords auto
```

The script will ask you if you want to continue. Acknowledge that with `y`. It will dump a couple of usernames and passwords. **Store those credentials in a safe place**, you will need them later, and possibly in the future.

### Step 2: Kibana

Next, open the configuration file at `config/kibana`. Replace `ELASTICSEARCH_PASSWORD` with the password for `kibana_system` that has been provided by the previous step.

With the credentials entered into the config file, let's start Kibana and the app-internal reverse-proxy with

```
docker-compose up kibana -d
docker-compose up reverse-proxy -d
```

Wait another few minutes, while Kibana creates the required data storage and gets itself ready.

If you're running the stack locally, see if you get Kibana to show up at `http://localhost:8080/kibana/`. If this is running on a server on the Internet, access `https://web-bugs-analysis.example.com/kibana/`.

As soon as you see the login screen, you're done with this step.

### Step 3: API credentials for internal services

Log into the Kibana UI with the username `elastic`, and the password generated in Step 1. It should let you in without complaining.

In the menu (which you need to expand by clicking the hamburger menu in the top left), head to "Stack Management" -> "Security" -> "API keys". Create a new API key with the name `web-bugs-analysis`, and leave all three checkboxes unchecked. It will show you a Base64 encoded API key. Copy this information, you'll only see this once. It's not a bad idea to store this API key in the same place as the other credentials.

Now, open `config/environment`. At the bottom of that file, set the value of `ELASTIC_API_KEY` to the API key you just generated.

Finally, run

```
docker-compose up -d
```

which will start all other services, and restart a couple of services because you changed the config files. When it appears to be done, check the process states with

```
docker-compose ps
```

There, you should see all processes marked as "running". The only exception here is the `queue-cli` service, which will show as `exited (0)`. This is expected, as that service will only start when you interact with it.

### Step 4: Final touches

The biggest part is done! Some final touches are needed, though.

- Set up snapshots and backups. Please see `/_docs/components.md` for details.
- Customize the "Kibana Space". With the `elastic` user, head to "Stack Management" > "Kibana" > "Spaces" > "Default". From the "Features" section, disable everything but "Analytics". The other features are not needed in our setup and only cause additional noise.
- Create user accounts. You should not work with the `elastic` user. Instead, it is recommended to create user accounts that only have read-only access to the bug data, and work with those users. User Access Management is beyond the scope of this documentation, please consult the Kibana documentation for details.
  If a use case needs write-access, create a new user account for that, and create an API key for that user. Note that the permission model allows you to limit write access to specific indices only, which is recommended to do.
- Set up the `htpasswd` for accessing the public `/data/` folder. The file is located at `config/htpsswd-data`, [the official nginx documentation](http://nginx.org/en/docs/http/ngx_http_auth_basic_module.html#auth_basic_user_file) explains how to format and encode passwords.
- Set up GitHub Webhooks: to allow the data to be updated in "real-time", go to the `web-bugs` repository and set up a Webhook. The Payload URL should be `https://web-bugs-analysis.example.com/webhooks/github/receive`, the content type should be set to `application/json`, and you should select "individual events" and only mark "Issue comments" and "Issues". That's enough for us.
