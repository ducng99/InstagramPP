// ==UserScript==
// @name         Instagram++
// @namespace    maxhyt.instagrampp
// @version      3.4.1
// @description  Instagram++ Help Tools
// @author       Maxhyt
// @homepage     https://ducng99.github.io/InstagramPP
// @homepageURL  https://ducng99.github.io/InstagramPP
// @match        https://www.instagram.com/*
// @updateURL    https://ducng99.github.io/InstagramPP/InstagramPlusPlus.meta.js
// @downloadURL  https://ducng99.github.io/InstagramPP/InstagramPlusPlus.user.js
// @require      https://code.jquery.com/jquery-3.5.1.min.js
// @run-at       document-idle
// ==/UserScript==

(function () {
    var $ = jQuery;
    
    setInterval(MainLoop, 2000);

    function MainLoop() {
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
        $.each(articles, function(i, article)
        {
            let feedMenu = $(article).find(".ltpMr.Slqrh")[0];
            
            if (feedMenu.innerHTML.indexOf("Download") === -1)
            {                
                let src;
                let picLink;

                let picCount = $(article).find("div._3eoV-.IjCL9");
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

                let arrowArticleLeft = $(".coreSpriteLeftPaginationArrow")[0];
                if (typeof arrowArticleLeft !== "undefined")
                {
                    arrowArticleLeft.onclick = function() { reset(document, 800); };
                }

                let arrowArticleRight = $(".coreSpriteRightPaginationArrow")[0];
                if (typeof arrowArticleRight !== "undefined")
                {
                    arrowArticleRight.onclick = function() { reset(document, 800); };
                }

                let arrowSwitchLeft = $(article).find(".coreSpriteLeftChevron")[0];
                if (typeof arrowSwitchLeft !== "undefined")
                {
                    arrowSwitchLeft.onclick = function() { reset(article, 500); };
                }

                let arrowSwitchRight = $(article).find(".coreSpriteRightChevron")[0];
                if (typeof arrowSwitchRight !== "undefined")
                {
                    arrowSwitchRight.onclick = function() { reset(article, 500); };
                }
            
                $(feedMenu).append('<span class="coreDownloadSaveButton"><a class="wpO6b" href="' + src + '" target="_blank"><div class="QBdPU"><svg class="_8-yf5" width="24" height="24" viewBox="0 0 16 16" fill="#262626" aria-label="Download"><path fill-rule="evenodd" d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5z"/><path fill-rule="evenodd" d="M7.646 11.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V1.5a.5.5 0 0 0-1 0v8.793L5.354 8.146a.5.5 0 1 0-.708.708l3 3z"/></svg></div></a></span>');
            }
        });
    }

    function reset(article, timeout)
    {
        setTimeout(() => {
            $(article).find(".coreDownloadSaveButton").remove();
            MainLoop();
        }, timeout);
    }
})();
