// ==UserScript==
// @name         Instagram++
// @namespace    maxhyt.instagrampp
// @version      2.4
// @description  Instagram++ Help Tools
// @author       Maxhyt
// @homepage     https://maxhyt.github.io/InstagramPlusPlus/
// @homepageURL  https://maxhyt.github.io/InstagramPlusPlus/
// @match        https://www.instagram.com/*
// @updateURL    https://maxhyt.github.io/InstagramPlusPlus/InstagramPlusPlus.meta.js
// @downloadURL  https://maxhyt.github.io/InstagramPlusPlus/InstagramPlusPlus.user.js
// @require      https://code.jquery.com/jquery-3.3.1.min.js
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM.setValue
// @grant        GM.getValue
// @grant        GM_registerMenuCommand
// ==/UserScript==

(function () {
//SETUP
    String.prototype.replaceAll = function(target, replacement) {
        return this.split(target).join(replacement);
    };

    const gm = {};
    if (typeof GM_setValue === "function")
        gm.setValue = GM_setValue;
    else
        gm.setValue = GM.setValue;

    if (typeof GM_getValue === "function")
        gm.getValue = GM_getValue;
    else
        gm.getValue = GM.getValue;

    if (typeof GM_registerMenuCommand === 'undefined') {
        gm.registerMenuCommand = (caption, commandFunc, accessKey) => {
            if (!document.body) {
                if (document.readyState === 'loading' && document.documentElement && document.documentElement.localName === 'html') {
                    new MutationObserver((mutations, observer) => {
                        if (document.body) {
                            observer.disconnect();
                            GM_registerMenuCommand(caption, commandFunc, accessKey);
                        }
                    }).observe(document.documentElement, {childList: true});
                } else {
                    console.error('GM_registerMenuCommand got no body.');
                }
                return;
            }
            let contextMenu = document.body.getAttribute('contextmenu');
            let menu = (contextMenu ? document.querySelector('menu#' + contextMenu) : null);
            if (!menu) {
                menu = document.createElement('menu');
                menu.setAttribute('id', 'gm-registered-menu');
                menu.setAttribute('type', 'context');
                document.body.appendChild(menu);
                document.body.setAttribute('contextmenu', 'gm-registered-menu');
            }
            let menuItem = document.createElement('menuitem');
            menuItem.textContent = caption;
            menuItem.addEventListener('click', commandFunc, true);
            menu.appendChild(menuItem);
        };
    }
    else
        gm.registerMenuCommand = GM_registerMenuCommand;

    var curHour = Math.round(new Date().getTime()/3600000);
  	var lastFetch = -2;
//END SETUP
  (async function() {
    if (typeof gm.getValue("lastFetch") === "undefined")
    {
        gm.setValue("lastFetch", 0);
    }
    else
    {
		let i = await gm.getValue("lastFetch", -1);
        if (i === -1)
        {
          	gm.setValue("lastFetch", 0);
        }
    }

    lastFetch = await gm.getValue("lastFetch");
    var r = await gm.getValue("storyJS");

    gm.registerMenuCommand("IG++ Fetch story script", function() { gm.setValue("lastFetch", 0); location.href="https://www.instagram.com"; });

    if (lastFetch < (curHour - 6))
    {
        alert("IG++: IG Story script outdated. Click on any stories to generate a new one!");
        setTimeout(function()
        {
            var storyPanel = jQuery(".aD2cN")[0];
            if (typeof storyPanel !== "undefined")
            {
                storyPanel.onclick = function () {
                    setTimeout(function() {
                        var scripts = jQuery("script");
                        for (var i = 0; i < scripts.length; i++)
                        {
                            if (scripts[i].src.indexOf("DesktopStories") !== -1)
                            {
                                var storyLink = scripts[i].src;
                                jQuery.ajax({
                                    method: "POST",
                                    url: storyLink
                                }).done(function(msg) {
                                    r = msg.replaceAll(/,\w\.props\.onNext\(\"automatic_forward\"\)/, "").replaceAll("isEnded: !0","isEnded: !1");
                                    gm.setValue("storyJS", r);
                                    gm.setValue("lastFetch", curHour);
                                    if(confirm("I need to refresh this page so the new script can work. Do you want me to refresh?"))
                                    {
                                        window.location.href = "https://www.instagram.com";
                                        throw "Updated!";
                                    }
                                });
                                break;
                            }
                        }
                    }, 2000);
                };
            }
        }, 1000);
    }

    implement();
    function implement()
    {
        setTimeout(function() {
            if (lastFetch >= (curHour - 6))
            {
                var pplus = document.createElement("script");
                pplus.type = "text/javascript";
                pplus.innerHTML = r + " alert(\"IG++: Instagram Stories script overrided!\");";
                jQuery("head")[0].appendChild(pplus);
            }
            else
                implement();
        }, 1000);
    }

    dlButton();
    function dlButton()
    {
        setTimeout(function () {
//Story
            var storyMenu = jQuery(".mt3GC")[0];
            if (typeof storyMenu !== "undefined" && storyMenu.innerHTML.indexOf("Download") === -1 && window.location.href.indexOf("stories") !== -1)
            {
                var stPicLink = jQuery(".y-yJ5._7NpAS.i1HvM")[0];
                var stVidLink = jQuery(".y-yJ5.OFkrO")[0];

                if (typeof stPicLink !== "undefined")
                    storyMenu.innerHTML += "<a class=\"aOOlW HoLwm\" href=\"" + stPicLink.src + "\" download target=\"_blank\">Download</a>";
                else if (typeof stVidLink !== "undefined")
                    storyMenu.innerHTML += "<a class=\"aOOlW HoLwm\" href=\"" + stVidLink.getElementsByTagName("source")[0].src + "\" download target=\"_blank\">Download</a>";
                else
                    storyMenu.innerHTML += "<a class=\"aOOlW HoLwm\" onclick=\"alert('Error: Could not get link');\">Download</a>";
                storyMenu.innerHTML += "<a class=\"aOOlW HoLwm\" target=\"_blank\" href=\"https://maxhyt.github.io/InstagramPlusPlus\">IG++ Guide</a>";
            }
//News Feed
            var article = jQuery("article.M9sTE.L_LMM");
            for (var i = 0; i < article.length; i++)
            {

                var src;
                var picLink = article[i].getElementsByClassName("FFVAD")[0];
                var vidLink = article[i].getElementsByClassName("tWeCl")[0];

                if (typeof picLink !== "undefined")
                    src = picLink.src;
                else if (typeof vidLink !== "undefined")
                    src = vidLink.src;

                var feedMenu = article[i].getElementsByClassName("ltpMr Slqrh")[0];

                /*var arrowFeedLeft = article[i].getElementsByClassName("MpBh3 _2Igxi rtQVh")[0];
                if (typeof arrowFeedLeft !== "undefined")
                {
                    arrowFeedLeft.onclick = function () { reset(); };
                }

                var arrowFeedRight = article[i].getElementsByClassName("MpBh3 Zk-Zb YqVDN")[0];
                if (typeof arrowFeedRight !== "undefined")
                {
                    arrowFeedRight.onclick = function () { reset(); };
                }*/
//Profile
                var arrowArticleLeft = document.getElementsByClassName("coreSpriteLeftPaginationArrow")[0];
                if (typeof arrowArticleLeft !== "undefined")
                {
                    arrowArticleLeft.onclick = function () { setTimeout(reset, 800); };
                }

                var arrowArticleRight = document.getElementsByClassName("coreSpriteRightPaginationArrow")[0];
                if (typeof arrowArticleRight !== "undefined")
                {
                    arrowArticleRight.onclick = function () { setTimeout(reset, 800); };
                }

                var arrowSwitchLeft = article[0].getElementsByClassName("coreSpriteLeftChevron")[0];
                if (typeof arrowSwitchLeft !== "undefined")
                {
                    arrowSwitchLeft.onclick = function () { setTimeout(reset, 500); };
                }

                var arrowSwitchRight = article[0].getElementsByClassName("coreSpriteRightChevron")[0];
                if (typeof arrowSwitchRight !== "undefined")
                {
                    arrowSwitchRight.onclick = function () { setTimeout(reset, 500); };
                }

                if (feedMenu.innerHTML.indexOf("Download") === -1)
                    feedMenu.innerHTML += "<span class=\"_15y0l\"><a class=\"coreDownloadSaveButton\" href=\"" + src + "\" download target=\"_blank\"><button class=\"oF4XW dCJp8\"><span style=\"background-image: url(https://maxhyt.github.io/InstagramPlusPlus/download.png); width: 24px; height: 24px;\"></span></button></a></span>";
            }
            dlButton();
        }, 500);
    }

    function reset()
    {
        var tmp = jQuery(".coreDownloadSaveButton");
        for (var m = 0; m < tmp.length; m++)
        {
            tmp[m].parentNode.removeChild(tmp[m]);
        }
    }
  })();
})();
