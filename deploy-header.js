if (window.location.protocol === "http:" && window.location.hostname !== "localhost") {
  var loc = window.location;
  window.location.href = "https://" + loc.hostname + loc.pathname + loc.search;
}

var version = 736;
var version = (new Date()).getTime();

// API base URL.
// Dev (same-origin via Spring Boot): leave empty to call /api/... on this origin.
// Prod (external static host): set explicitly to the API origin, e.g. "https://api.example.com".
var settings = window.settings || (window.settings = {});

if (settings.apiBase == null) {
  settings.apiBase = "https://www.p26-intelligence.com";
}

//settings.mcDomain = "https://production.empowering-trainers.com/";
settings.mcDomain = "https://production.turbotons.com/";
//settings.mcDomain = "https://new-dev.empowering-trainers.com/";
settings.jsDomain = "https://mateus.fastcloud.com/";
//settings.jsDomain = "https://dev.empowering-trainers.com/";

settings.env = "dev";
settings.jsDir = "";
settings.jsVersion = version;
settings.fbId = "255082051529969";

function initEnvSettings()
{
  mc_domain = settings.mcDomain;
  g_env = settings.env;
}
initEnvSettings();

var isLoaded = false;

function loadCustomScript(spec)
{
    var jsDomain = spec.jsDomain;
    var path = spec.path;
    var mcDomain = spec.mcDomain;
    var jsVersion = (new Date()).getTime();

    var d = document;
    var s = "script";
    if(d.getElementById(path))
    {
    return;
    }

  var scriptNode = d.getElementsByTagName(s)[0];
    var js = d.createElement(s);
    js.id = path;

  if(mcDomain)
    {
      mc_domain = mcDomain;

      setTimeout(function(){
        mc_domain = mcDomain;
      }, 1000);

      setTimeout(function(){
        mc_domain = mcDomain;
      }, 3000);

      setTimeout(function(){
      mc_domain = mcDomain;
      }, 5000);

    }

    var fullPath = jsDomain + path + "?v=" + jsVersion;
    js.src = fullPath;
    scriptNode.parentNode.insertBefore(js, scriptNode);
}


function loadScript(path, omitLoadedCheck)
{
  if(isLoaded && !omitLoadedCheck)
    {
      return;
    }
  isLoaded = true;

    var d = document;
    var s = "script";
    if(d.getElementById(path))
    {
    return;
    }

  var isDebug = false;
  try
    {
    var url = new URL(window.top.location.href);
  isDebug = url.searchParams.get("debug") === "evan";
    }
  catch(e){}

  var scriptNode = d.getElementsByTagName(s)[0];
  var js = d.createElement(s);
  js.id = path;
  js.type = "module";

  if(isDebug)
    {
      var useSettings = settings;

      isDebugBe = url.searchParams.get("debug-be") === "true";
        mc_domain = isDebugBe ? "https://ew.ngrok.io/" : useSettings.mcDomain;
        g_env = useSettings.env;
        var jsDomain = "https://dev.empowering-trainers.com/";
    var jsVersion = (new Date()).getTime();

        fbId = useSettings.fbId;
        var fullPath = jsDomain + useSettings.jsDir + path + "?v=" + jsVersion;
        js.src = fullPath;
        scriptNode.parentNode.insertBefore(js, scriptNode);
    }
  else
    {
      var useSettings = settings;

      mc_domain = useSettings.mcDomain;
      g_env = useSettings.env;

      fbId = useSettings.fbId;
      var fullPath = useSettings.jsDomain + useSettings.jsDir + path + "?v=" + useSettings.jsVersion;
      js.src = fullPath;
      scriptNode.parentNode.insertBefore(js, scriptNode);
}
}

function loadES6(path)
{
  if(!checkES6())
    {
    return;
    }

    var d = document;
    var s = "script";
    if(d.getElementById(path))
    {
    return;
    }

  var scriptNode = d.getElementsByTagName(s)[0];
    var js = d.createElement(s);
    js.id = path;

    var useSettings = settings; //settings[window.location.host] || settings["default"];
    var fullPath = useSettings.jsDomain + useSettings.jsDir + path + "?v=" + useSettings.jsVersion;
    js.src = fullPath;
    scriptNode.parentNode.insertBefore(js, scriptNode);
}

function checkES6() {
    "use strict";

    if (typeof Symbol == "undefined") return false;
    try {
        eval("class Foo {}");
        eval("var bar = (x) => x+1");
        eval("async function test(){await something();}");
    } catch (e) { return false; }

    return true;
}