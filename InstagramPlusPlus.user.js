// ==UserScript==
// @name         Instagram++
// @namespace    maxhyt.instagrampp
// @version      3.7.0
// @description  Add addtional features to Instagram
// @author       Maxhyt
// @license      GPL-3.0
// @icon         https://icons.duckduckgo.com/ip2/instagram.com.ico
// @homepage     https://ducng99.github.io/InstagramPP
// @match        https://www.instagram.com/*
// @run-at       document-start
// ==/UserScript==

(function () {
    let CapturedMediaURLs = [];
    
    setInterval(MainLoop, 2000);

    function MainLoop() {
        //Story
        let storyMenu = document.querySelector(".mt3GC");
        if (storyMenu !== null && storyMenu.innerHTML.indexOf("Download") === -1 && window.location.href.indexOf("stories") !== -1) {
            let stPicLink = document.querySelector(".y-yJ5.i1HvM");
            let stVidLink = document.querySelector(".y-yJ5.OFkrO");

            if (stPicLink !== null) {
                let newNode = document.createElement("div");
                newNode.innerHTML = "<button class=\"aOOlW HoLwm\" onclick=\"window.open('" + stPicLink.getAttribute("srcset").split(" 1080w")[0] + "', '_blank')\">Download</button>"
                storyMenu.appendChild(newNode.firstChild);
            }
            else if (stVidLink !== null) {
                let newNode = document.createElement("div");
                newNode.innerHTML = "<button class=\"aOOlW HoLwm\" onclick=\"window.open('" + stVidLink.querySelector("source").getAttribute("src") + "', '_blank')\">Download</button>";
                storyMenu.appendChild(newNode.firstChild);
            }
            else {
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

    async function ProcessArticle(article) {
        let feedMenu = article.querySelector(".ltpMr.Slqrh");

        if (feedMenu.innerHTML.indexOf("Download") === -1) {
            const mediaCount = article.querySelector("div._3eoV-.IjCL9");
            const src = GetMediaSrc(article, mediaCount);

            if (!src) {
                return;
            }

            let arrowArticleLeft = document.body.querySelector(".coreSpriteLeftPaginationArrow");
            if (arrowArticleLeft !== null) {
                arrowArticleLeft.addEventListener('click', () => { ResetDownloadLink(document, 100); });
            }

            let arrowArticleRight = document.body.querySelector(".coreSpriteRightPaginationArrow");
            if (arrowArticleRight !== null) {
                arrowArticleRight.addEventListener('click', () => { ResetDownloadLink(document, 100); });
            }

            let arrowSwitchLeft = article.querySelector(".coreSpriteLeftChevron");
            if (arrowSwitchLeft !== null) {
                arrowSwitchLeft.addEventListener('click', () => { ResetDownloadLink(article, 100); });
            }

            let arrowSwitchRight = article.querySelector(".coreSpriteRightChevron");
            if (arrowSwitchRight !== null) {
                arrowSwitchRight.addEventListener('click', () => { ResetDownloadLink(article, 100); });
            }
            let newNode = document.createElement("div");
            newNode.innerHTML = '<span class="igpp_download"><a class="wpO6b" href="' + src + '" target="_blank"><div class="QBdPU"><svg class="_8-yf5" width="24" height="24" viewBox="0 0 16 16" fill="#262626" aria-label="Download"><path fill-rule="evenodd" d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5z"/><path fill-rule="evenodd" d="M7.646 11.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V1.5a.5.5 0 0 0-1 0v8.793L5.354 8.146a.5.5 0 1 0-.708.708l3 3z"/></svg></div></a></span>';
            feedMenu.appendChild(newNode.firstChild);
        }
    }
    
    function GetMediaSrc(article, mediaCountDOM) {
        let mediaIndex = -1;
        let src = '';
        
        if (mediaCountDOM && mediaCountDOM.children.length > 1) {
            let current = mediaCountDOM.querySelector(".Yi5aA.XCodT");
            mediaIndex = [...mediaCountDOM.children].indexOf(current);
            let listMedias = article.querySelectorAll("li.Ckrof");
            let currentMediaDOM;

            if (mediaIndex === mediaCountDOM.children.length - 1) {
                currentMediaDOM = listMedias[listMedias.length - 1];
            }
            else if (listMedias.length === 4 && mediaIndex > 0 && mediaIndex % 2 !== 0) {
                currentMediaDOM = listMedias[listMedias.length - 3];
            }
            else {
                currentMediaDOM = listMedias[listMedias.length - 2];
            }
        }

        let dateDOM = article.querySelector(".NnvRN > a");
        if (dateDOM) {
            for (const links of CapturedMediaURLs) {
                if (dateDOM.href.includes(links.postID)) {
                    if (mediaIndex === -1) {
                        src = links.src;
                    }
                    else {
                        src = links.srcs[mediaIndex];
                    }
                }
            }
        }
        
        return src;
    }

    function ResetDownloadLink(article, timeout) {
        setTimeout(() => {
            article.querySelector(".igpp_download").remove();
            MainLoop();
        }, timeout);
    }
    
    let XHR_open = XMLHttpRequest.prototype.open;

    // Overwrite the native method
    XMLHttpRequest.prototype.open = function() {
        // Assign an event listener
        this.addEventListener("load", event => {
            let response = JSON.parse(event.target.responseText);
            
            if (event.target.responseURL === "https://i.instagram.com/api/v1/feed/timeline/") {
                response.feed_items.forEach(item => {
                    let postID = item.code;
                    if (item.video_versions) {
                        let src = item.video_versions[item.video_versions.length - 1].url;
                        CapturedMediaURLs.push({ postID, src });
                    }
                });
            }
            else if (event.target.responseURL.includes("https://www.instagram.com/graphql/query/")){
                const media = response.data.shortcode_media;
                if (media) {
                    ProcessMediaObj(media);
                }
            }
        }, false);
        // Call the stored reference to the native method
        XHR_open.apply(this, arguments);
    };
    
    window.addEventListener('load', () => {
        const AllScripts = document.querySelectorAll('script');
        AllScripts.forEach(script => {
            if (script.innerHTML.startsWith("window.__additionalDataLoaded")) {
                let matches = /window\.__additionalDataLoaded\('.*',(.*)\);/.exec(script.innerHTML);
                if (matches[1]) {
                    let media = JSON.parse(matches[1])?.graphql.shortcode_media;
                    if (media) {
                        ProcessMediaObj(media);
                    }
                }
            }
        });
    });
    
    function ProcessMediaObj(media) {
        const postID = media.shortcode;
        
        if (media.__typename === "GraphSidecar") {
            let links = [];
            
            media.edge_sidecar_to_children.edges.forEach(edge => {
                let link = ProcessMediaObj(edge.node);
                links.push(link.src);
            });
            
            CapturedMediaURLs.push({ postID, srcs: links });
        }
        else if (media.is_video) {
            let src = media.video_url;
            if (src) {
                CapturedMediaURLs.push({ postID, src });
                return { postID, src };
            }
        }
        else {
            let src = media.display_resources[media.display_resources.length - 1]?.src;
            if (src) {
                CapturedMediaURLs.push({ postID, src });
                return { postID, src };
            }
        }
    }
})();
