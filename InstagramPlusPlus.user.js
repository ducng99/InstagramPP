// ==UserScript==
// @name         Instagram++
// @namespace    maxhyt.instagrampp
// @version      3.5.1
// @description  Instagram++ Help Tools
// @author       Maxhyt
// @homepage     https://ducng99.github.io/InstagramPP
// @homepageURL  https://ducng99.github.io/InstagramPP
// @match        https://www.instagram.com/*
// @updateURL    https://ducng99.github.io/InstagramPP/InstagramPlusPlus.meta.js
// @downloadURL  https://ducng99.github.io/InstagramPP/InstagramPlusPlus.user.js
// ==/UserScript==

(function () {    
    setInterval(MainLoop, 2000);

    function MainLoop() {
//Story
        let storyMenu = document.querySelector(".mt3GC");
        if (storyMenu !== null && storyMenu.innerHTML.indexOf("Download") === -1 && window.location.href.indexOf("stories") !== -1)
        {
            let stPicLink = document.querySelector(".y-yJ5.i1HvM");
            let stVidLink = document.querySelector(".y-yJ5.OFkrO");

            if (stPicLink !== null)
            {
                let newNode = document.createElement("div");
                newNode.innerHTML = "<button class=\"aOOlW HoLwm\" onclick=\"window.open('" + stPicLink.getAttribute("srcset").split(" 1080w")[0] + "', '_blank')\">Download</button>"
                storyMenu.appendChild(newNode.firstChild);
            }
            else if (stVidLink !== null)
            {
                let newNode = document.createElement("div");
                newNode.innerHTML = "<button class=\"aOOlW HoLwm\" onclick=\"window.open('" + stVidLink.querySelector("source").getAttribute("src") + "', '_blank')\">Download</button>";
                storyMenu.appendChild(newNode.firstChild);
            }
            else
            {
                let newNode = document.createElement("div");
                newNode.innerHTML = "<button class=\"aOOlW HoLwm\" onclick=\"alert('Error: Could not get link');\">Download</button>";
                storyMenu.appendChild(newNode.firstChild);
            }
        }
        
        //News Feed
        let articles = Array.from(document.body.querySelectorAll("article.M9sTE.L_LMM"));
        let promises = articles.map(ProcessArticle);
        Promise.all(promises);
    }
    
    function ProcessArticle(article)
    {
        return new Promise(resolve => {
            let feedMenu = article.querySelector(".ltpMr.Slqrh");
            
            if (feedMenu.innerHTML.indexOf("Download") === -1)
            {                
                let src = null;
                let picLink = null;

                let picCount = article.querySelector("div._3eoV-.IjCL9");
                if (picCount !== null && picCount.children.length > 0)
                {
                    let current = picCount.querySelector(".Yi5aA.XCodT");
                    let index = Array.from(picCount.children).indexOf(current);
                    let listPics = article.querySelectorAll("li.Ckrof");

                    if (index != picCount.children.length - 1)
                    {
                        picLink = listPics[listPics.length - 2].querySelector(".FFVAD");
                    }
                    else
                    {
                        picLink = listPics[listPics.length - 1].querySelector(".FFVAD");
                    }
                }
                else
                {
                    picLink = article.querySelector(".FFVAD");
                }

                let vidLink = article.querySelector(".tWeCl");

                if (picLink !== null)
                {
                    src = picLink.getAttribute("srcset").split("750w,")[1].split(" 1080w")[0];
                }
                else if (vidLink !== null)
                {
                    src = vidLink.src;
                }
                
                if (src === null)
                {
                    return;
                }

                let arrowArticleLeft = document.body.querySelector(".coreSpriteLeftPaginationArrow");
                if (arrowArticleLeft !== null)
                {
                    arrowArticleLeft.onclick = function() { reset(document, 800); };
                }

                let arrowArticleRight = document.body.querySelector(".coreSpriteRightPaginationArrow");
                if (arrowArticleRight !== null)
                {
                    arrowArticleRight.onclick = function() { reset(document, 800); };
                }

                let arrowSwitchLeft = article.querySelector(".coreSpriteLeftChevron");
                if (arrowSwitchLeft !== null)
                {
                    arrowSwitchLeft.onclick = function() { reset(article, 500); };
                }

                let arrowSwitchRight = article.querySelector(".coreSpriteRightChevron");
                if (arrowSwitchRight !== null)
                {
                    arrowSwitchRight.onclick = function() { reset(article, 500); };
                }
                let newNode = document.createElement("div");
                newNode.innerHTML = '<span class="igpp_download"><a class="wpO6b" href="' + src + '" target="_blank"><div class="QBdPU"><svg class="_8-yf5" width="24" height="24" viewBox="0 0 16 16" fill="#262626" aria-label="Download"><path fill-rule="evenodd" d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5z"/><path fill-rule="evenodd" d="M7.646 11.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V1.5a.5.5 0 0 0-1 0v8.793L5.354 8.146a.5.5 0 1 0-.708.708l3 3z"/></svg></div></a></span>';
                feedMenu.appendChild(newNode.firstChild);
            }
        });
    }

    function reset(article, timeout)
    {
        setTimeout(() => {
            article.querySelector(".igpp_download").remove();
            MainLoop();
        }, timeout);
    }
})();
