/**
 * This script will search the active queue and blocklist and research
 * For use alongside this strategy https://fileflows.com/docs/guides/sonarr-radarr
 * @author Lawrence Curtis
 * @version 1.0.0
 * @revision 1
 * @param {string} URI Radarr/Sonarr root URI and port (e.g. http://radarr:1234)
 * @param {string} ApiKey API Key
 * @output Item blocklisted
 * @output Item not found
 */
function Script(URI, ApiKey) {
    const blocklist = new Blocklist(URI, ApiKey);
    return blocklist.check(Variables.folder.Name);
}

class Blocklist {
    constructor(uri, apikey) {
        if (!URI || !ApiKey) {
            Logger.ELog("No credentials specified");
            return -1;
        }

        this.uri = uri;
        this.apikey = apikey;
    }

    getUrl(endpoint) {
        let url = "" + this.uri;
        if (url.endsWith("/") === false) url += "/";
        if (!endpoint.includes("?")) {
            endpoint = `${endpoint}?`;
        } else {
            endpoint = `${endpoint}&`;
        }
        return `${url}api/v3/${endpoint}apikey=${this.apikey}`;
    }

    getJson(endpoint) {
        let url = this.getUrl(endpoint);
        let response = http.GetAsync(url).Result;

        let body = response.Content.ReadAsStringAsync().Result;
        if (!response.IsSuccessStatusCode) {
            Logger.WLog("Unable to fetch: " + endpoint + "\n" + body);
            return null;
        }
        return JSON.parse(body);
    }

    deleteJson(endpoint) {
        let url = this.getUrl(endpoint);
        return http.DeleteAsync(url).Result;
    }

    check(path) {
        let queue = this.getJson("queue?pageSize=9999");
        if(!queue)
            return 2; 
        
        let found = false;

        queue.records.forEach((item) => {
            if (path.includes(item.title)) {
                Logger.ILog(`Removing item ${item.title} from ${item.downloadClient}`);
                found = true;
                let endpoint = `queue/${item.id}?blocklist=true`;
                this.deleteJson(endpoint);
            }
        });

        if (found) {
            return 1;
        } else {
            return 2;
        }
    }
}
