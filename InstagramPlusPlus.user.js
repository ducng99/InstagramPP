// ==UserScript==
// @name         Instagram++
// @namespace    maxhyt.instagrampp
// @version      3.1
// @description  Instagram++ Help Tools
// @author       Maxhyt
// @homepage     https://ducng99.github.io/InstagramPP
// @homepageURL  https://ducng99.github.io/InstagramPP
// @match        https://www.instagram.com/*
// @updateURL    https://ducng99.github.io/InstagramPP/InstagramPlusPlus.meta.js
// @downloadURL  https://ducng99.github.io/InstagramPP/InstagramPlusPlus.user.js
// @require      https://code.jquery.com/jquery-3.3.1.min.js
// ==/UserScript==

(function () {
    dlButton();
    function dlButton()
    {
        setTimeout(function () {
//Story
            var storyMenu = jQuery(".mt3GC")[0];
            if (typeof storyMenu !== "undefined" && storyMenu.innerHTML.indexOf("Download") === -1 && window.location.href.indexOf("stories") !== -1)
            {
                var stPicLink = jQuery(".y-yJ5.i1HvM")[0];
                var stVidLink = jQuery(".y-yJ5.OFkrO")[0];

                if (typeof stPicLink !== "undefined")
                    storyMenu.innerHTML += "<a class=\"aOOlW HoLwm\" href=\"" + stPicLink.getAttribute("srcset").split("750w,")[1].split(" 1080w")[0] + "\" download target=\"_blank\">Download</a>";
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
                    src = picLink.getAttribute("srcset").split("750w,")[1].split(" 1080w")[0];
                else if (typeof vidLink !== "undefined")
                    src = vidLink.src;

                var feedMenu = article[i].getElementsByClassName("ltpMr Slqrh")[0];

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

                var arrowSwitchLeft = article[i].getElementsByClassName("coreSpriteLeftChevron")[0];
                if (typeof arrowSwitchLeft !== "undefined")
                {
                    arrowSwitchLeft.onclick = function () { setTimeout(reset, 500); };
                }

                var arrowSwitchRight = article[i].getElementsByClassName("coreSpriteRightChevron")[0];
                if (typeof arrowSwitchRight !== "undefined")
                {
                    arrowSwitchRight.onclick = function () { setTimeout(reset, 500); };
                }

                if (feedMenu.innerHTML.indexOf("Download") === -1)
                    feedMenu.innerHTML += "<span class=\"_15y0l\"><a class=\"coreDownloadSaveButton\" href=\"" + src + "\" download target=\"_blank\"><button class=\"dCJp8 afkep _0mzm-\"><span style=\"background-image: url(https://maxhyt.github.io/InstagramPlusPlus/download.png); width: 24px; height: 24px;\"></span></button></a></span>";
            }
            dlButton();
        }, 1000);
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
