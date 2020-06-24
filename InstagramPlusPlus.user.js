// ==UserScript==
// @name         Instagram++
// @namespace    maxhyt.instagrampp
// @version      3.2
// @description  Instagram++ Help Tools
// @author       Maxhyt
// @homepage     https://ducng99.github.io/InstagramPP
// @homepageURL  https://ducng99.github.io/InstagramPP
// @match        https://www.instagram.com/*
// @updateURL    https://ducng99.github.io/InstagramPP/InstagramPlusPlus.meta.js
// @downloadURL  https://ducng99.github.io/InstagramPP/InstagramPlusPlus.user.js
// @require      https://code.jquery.com/jquery-3.5.1.min.js
// ==/UserScript==

(function () {
    var $ = jQuery;

    (function dlButton()
    {
        setTimeout(function () {
//Story
            let storyMenu = $(".mt3GC")[0];
            if (typeof storyMenu !== "undefined" && storyMenu.innerHTML.indexOf("Download") === -1 && window.location.href.indexOf("stories") !== -1)
            {
                let stPicLink = $(".y-yJ5.i1HvM")[0];
                let stVidLink = $(".y-yJ5.OFkrO")[0];

                if (typeof stPicLink !== "undefined")
                {
                    storyMenu.innerHTML += "<a class=\"aOOlW HoLwm\" href=\"" + $(stPicLink).attr("srcset").split("750w,")[1].split(" 1080w")[0] + "\" download target=\"_blank\">Download</a>";
                }
                else if (typeof stVidLink !== "undefined")
                {
                    storyMenu.innerHTML += "<a class=\"aOOlW HoLwm\" href=\"" + $($(stVidLink).find("source")[0]).attr("src") + "\" download target=\"_blank\">Download</a>";
                }
                else
                {
                    storyMenu.innerHTML += "<a class=\"aOOlW HoLwm\" onclick=\"alert('Error: Could not get link');\">Download</a>";
                }

                storyMenu.innerHTML += "<a class=\"aOOlW HoLwm\" target=\"_blank\" href=\"https://maxhyt.github.io/InstagramPlusPlus\">IG++ Guide</a>";
            }
//News Feed
            let articles = $("article.M9sTE.L_LMM");
            for (let article of articles)
            {
                let src;
                let picLink;

                let picCount = $(article).find("div.ijCUd._3eoV-.IjCL9._19dxx");
                if (picCount.length > 0)
                {
                    let current = $(picCount).find(".XCodT")[0];
                    let index = $(picCount).children().index(current);
                    let listPics = $(article).find("li.Ckrof");

                    if (index != $(picCount).children().length - 1)
                    {
                        picLink = $(listPics[listPics.length - 2]).find(".FFVAD")[0];
                    }
                    else
                    {
                        picLink = $(listPics[listPics.length - 1]).find(".FFVAD")[0];
                    }
                }
                else
                {
                    picLink = $(article).find(".FFVAD")[0];
                }

                let vidLink = $(article).find(".tWeCl")[0];

                if (typeof picLink !== "undefined")
                {
                    src = $(picLink).attr("srcset").split("750w,")[1].split(" 1080w")[0];
                }
                else if (typeof vidLink !== "undefined")
                {
                    src = vidLink.src;
                }

                let feedMenu = $(article).find(".ltpMr.Slqrh")[0];

                let arrowArticleLeft = $(".coreSpriteLeftPaginationArrow")[0];
                if (typeof arrowArticleLeft !== "undefined")
                {
                    arrowArticleLeft.onclick = function() { setTimeout(reset, 800); };
                }

                let arrowArticleRight = $(".coreSpriteRightPaginationArrow")[0];
                if (typeof arrowArticleRight !== "undefined")
                {
                    arrowArticleRight.onclick = function() { setTimeout(reset, 800); };
                }

                let arrowSwitchLeft = $(article).find(".coreSpriteLeftChevron")[0];
                if (typeof arrowSwitchLeft !== "undefined")
                {
                    arrowSwitchLeft.onclick = function() { setTimeout(reset, 500); };
                }

                let arrowSwitchRight = $(article).find(".coreSpriteRightChevron")[0];
                if (typeof arrowSwitchRight !== "undefined")
                {
                    arrowSwitchRight.onclick = function() { setTimeout(reset, 500); };
                }

                if (feedMenu.innerHTML.indexOf("Download") === -1)
                {
                    feedMenu.innerHTML += "<span class=\"_15y0l\"><a class=\"coreDownloadSaveButton\" href=\"" + src + "\" download target=\"_blank\"><button class=\"dCJp8 afkep _0mzm-\"><span style=\"background-image: url(https://ducng99.github.io/InstagramPP/download.png); width: 24px; height: 24px;\"></span></button></a></span>";
                }
            }
            dlButton();
        }, 1000);
    })();

    function reset()
    {
        let tmp = $(".coreDownloadSaveButton");
        for (let button of tmp)
        {
            $(button).parent().remove();
        }
    }
})();
