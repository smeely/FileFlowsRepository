/**
 * Class that interacts with Sonarr
 * @name Sonarr
 * @revision 2
 * @minimumVersion 1.0.0.0
 */
export class Sonarr
{
    URL;
    ApiKey;

    constructor(URL, ApiKey)
    {
        this.URL = ((URL) ? URL : Variables['Sonarr.Url']);
        if (!this.URL)
            MissingVariable('Sonarr.Url');
        this.ApiKey = ((ApiKey) ? ApiKey : Variables['Sonarr.ApiKey']);
        if (!this.ApiKey)
            MissingVariable('Sonarr.ApiKey');
    }

    getUrl(endpoint, queryParmeters)
    {
        let url = '' + this.URL;
        if (url.endsWith('/') === false)
            url += '/';
        url = `${url}api/v3/${endpoint}?apikey=${this.ApiKey}`;
        if(queryParmeters)
            url += '&' + queryParmeters;
        return url;
    }

    fetchJson(endpoint, queryParmeters)
    {
        let url = this.getUrl(endpoint, queryParmeters);
        let json = this.fetchString(url);
        if(!json)
            return null;
        return JSON.parse(json);
    }

    fetchString(url)
    {
        let response = http.GetAsync(url).Result;
        let body = response.Content.ReadAsStringAsync().Result;
        if (!response.IsSuccessStatusCode)
        {
            Logger.WLog('Unable to fetch: ' + url + '\n' + body);
            return null;
        }
        return body;
    }

    /**
     * Gets all shows in Sonarr
     * @returns {object[]} a list of shows in the Sonarr
     */
    getAllShows(){
        let shows = this.fetchJson('series');
        if(!shows.length){
            Logger.WLog("No shows found");
            return [];
        }
        return shows;
    }

    getFilesInShow(show){
        let files = this.fetchJson('episodefile', 'seriesId=' + show.id);
        if(!files.length){
            
            Logger.WLog("No files in show: " + show.title);
            return [];
        }
        return files;
    }

    /**
     * Gets all files in Sonarr
     * @returns {object[]} all files in the Sonarr
     */
    getAllFiles(){
        let shows = this.getAllShows();
        let files = [];
        for(let show of shows){
            let sfiles = this.getFilesInShow(show);
            if(sfiles.length){
                for(let sfile of sfiles)
                    sfile.show = show;
                files = files.concat(sfiles);
            }
        }
        Logger.ILog('Number of show files found: ' + files.length);
        return files;
    }

    /**
     * Gets a show file from Sonarr by its full path
     * @param {string} path the full path of the movie to lookup
     * @returns {object} a show file object if found, otherwise null
     */
    getShowFileByPath(path)
    {
        if (!path)
        {
            Logger.WLog('No path passed in to find show file');
            return null;
        }
        let files = this.getAllFiles();
        if (!files?.length)
            return null;

        let cp = path.toString().toLowerCase();
        let showfile = files.filter(x =>
        {
            let sp = x.path;
            if (!sp)
                return false;
            return cp.includes(x.title.toLowerCase());
        });
        if (showfile?.length)
        {
            showfile = showfile[0];
            Logger.ILog('Found show file: ' + showfile.id);
            return showfile;
        }
        Logger.WLog('Unable to find show file at path: ' + path);
        return null;
    }

    /**
     * Gets the IMDb id of a show from its full file path
     * @param {string} path the full path of the show to lookup
     * @returns the IMDb id if found, otherwise null
     */
    getImdbIdFromPath(path)
    {
        if(!path)
            return null;
        let showfile = this.getShowFileByPath(path.toString());
        if (!showfile)
        {
            Logger.WLog('Unable to get IMDb ID for path: ' + path);
            return null;
        }
        return showfile.show.imdbId;
    }

    /**
     * Gets the TVDb id of a show from its full file path
     * @param {string} path the full path of the show to lookup
     * @returns the TVdb id if found, otherwise null
     */
    getTVDbIdFromPath(path)
    {
        if(!path)
            return null;
        let showfile = this.getShowFileByPath(path.toString());
        if (!showfile)
        {
            Logger.WLog('Unable to get TMDb ID for path: ' + path);
            return null;
        }
        return showfile.show.tvdbId;
    }

    /**
     * Gets the language of a show from its full file path
     * @param {string} path the full path of the show to lookup
     * @returns the language of the show if found, otherwise null
     */
    getOriginalLanguageFromPath(path)
    {
        if(!path)
            return null;
        let showfile = this.getShowFileByPath(path.toString());
        if (!showfile)
        {
            Logger.WLog('Unable to get language for path: ' + path);
            return null;
        }
        let imdbId = showfile.show.imdbId;

        let html = this.fetchString(`https://www.imdb.com/title/${imdbId}/`);
        let languages = html.match(/title-details-languages(.*?)<\/li>/);
        if(!languages)
        {
            Logger.WLog('Failed to lookup IMDb language for ' + imdbId);
            return null;
        }
        languages = languages[1];
        let language = languages.match(/primary_language=([\w]+)&/);
        if(!language)
        {
            Logger.WLog('Failed to lookup IMDb primary language for ' + imdbId);
            return null;
        }
        return language[1];
    }
}