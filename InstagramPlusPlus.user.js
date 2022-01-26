// ==UserScript==
// @name         Instagram++
// @namespace    maxhyt.instagrampp
// @version      3.8.6
// @description  Add addtional features to Instagram
// @author       Maxhyt
// @license      AGPL-3.0
// @icon         https://icons.duckduckgo.com/ip2/instagram.com.ico
// @homepage     https://github.com/ducng99/InstagramPP
// @match        https://www.instagram.com/*
// @run-at       document-start
// ==/UserScript==

(function () {
    let CapturedMediaURLs = [];

    setInterval(MainLoop, 2000);

    function MainLoop() {
        // Story
        let storyMenu = document.querySelector("._8p8kF");
        if (storyMenu && !storyMenu.querySelector('.igpp_download')) {
            const newNode = document.createElement('div');
            newNode.innerHTML = '<button class="wpO6b igpp_download" type="button"><div class="QBdPU"><svg width="18" height="18" fill="#ffffff" color="#ffffff" class="_8-yf5" viewBox="0 0 16 16"><path d="M8 2a5.53 5.53 0 0 0-3.594 1.342c-.766.66-1.321 1.52-1.464 2.383C1.266 6.095 0 7.555 0 9.318 0 11.366 1.708 13 3.781 13h8.906C14.502 13 16 11.57 16 9.773c0-1.636-1.242-2.969-2.834-3.194C12.923 3.999 10.69 2 8 2zm2.354 6.854-2 2a.5.5 0 0 1-.708 0l-2-2a.5.5 0 1 1 .708-.708L7.5 9.293V5.5a.5.5 0 0 1 1 0v3.793l1.146-1.147a.5.5 0 0 1 .708.708z"/></svg></div></button>';
            const downloadButton = newNode.firstChild;
            downloadButton.addEventListener('click', DownloadStory);
            storyMenu.insertBefore(downloadButton, storyMenu.firstChild);
        }

        // News Feed
        let articles = [...document.body.querySelectorAll("article.M9sTE.L_LMM")];
        Promise.all(articles.map(ProcessArticle));
        
        // Video
        [...document.body.querySelectorAll('video.tWeCl')].forEach(video => {
            if (video && video.volume == 1) {
                video.volume = 0.5;
            }
        });
    }
    
    function DownloadStory() {
        let stPicLink = document.body.querySelector("img.y-yJ5")?.getAttribute("srcset")?.split(" ")[0];
        let stVidLink = document.body.querySelector("video.y-yJ5.OFkrO")?.querySelector("source")?.getAttribute("src");

        if (stVidLink) {
            window.open(stVidLink, '_blank');
        }
        else if (stPicLink) {
            window.open(stPicLink, '_blank');
        }
        else {
            alert('Error: Cannot Find the link');
        }
    }

    async function ProcessArticle(article) {
        let feedMenu = article.querySelector('.ltpMr.Slqrh');

        if (!feedMenu.querySelector('.igpp_download')) {
            const src = GetMediaSrc(article);

            if (src) {
                let newNode = document.createElement("div");
                newNode.innerHTML = `<span class="igpp_download"><a class="wpO6b" href="${src}" target="_blank"><div class="QBdPU"><svg class="_8-yf5" width="24" height="24" viewBox="0 0 16 16" color="#262626" fill="#262626" aria-label="Download"><path fill-rule="evenodd" d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5z"/><path fill-rule="evenodd" d="M7.646 11.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V1.5a.5.5 0 0 0-1 0v8.793L5.354 8.146a.5.5 0 1 0-.708.708l3 3z"/></svg></div></a></span>`;
                feedMenu.appendChild(newNode.firstChild);
            }
        }
        
        let arrowSwitchLeft = article.querySelector('.coreSpriteLeftChevron');
        if (arrowSwitchLeft && !arrowSwitchLeft.classList.contains('igpp_checked')) {
            arrowSwitchLeft.addEventListener('click', () => { ResetDownloadLink(article, 100); });
            arrowSwitchLeft.classList.add('igpp_checked');
        }

        let arrowSwitchRight = article.querySelector('.coreSpriteRightChevron');
        if (arrowSwitchRight && !arrowSwitchRight.classList.contains('igpp_checked')) {
            arrowSwitchRight.addEventListener('click', () => { ResetDownloadLink(article, 100); });
            arrowSwitchRight.classList.add('igpp_checked');
        }
    }

    function GetMediaSrc(article) {
        let mediaIndex = -1;
        const mediaCountDOM = article.querySelector("div._3eoV-.IjCL9");

        if (mediaCountDOM && mediaCountDOM.children.length > 1) {
            let current = mediaCountDOM.querySelector(".Yi5aA.XCodT");
            mediaIndex = [...mediaCountDOM.children].indexOf(current);
        }

        const dateDOM = article.querySelector(".NnvRN > a");
        if (dateDOM) {
            for (const links of CapturedMediaURLs) {
                if (dateDOM.href.includes(links.postID)) {
                    if (mediaIndex === -1) {
                        return links.src;
                    }
                    else {
                        return links.srcs[mediaIndex];
                    }
                }
            }
        }

        return null;
    }

    function ResetDownloadLink(article, timeout) {
        setTimeout(() => {
            article.querySelector(".igpp_download")?.remove();
            ProcessArticle(article);
        }, timeout);
    }

    const XHR_open = XMLHttpRequest.prototype.open;

    // Overwrite the native method
    XMLHttpRequest.prototype.open = function () {
        if (!arguments[1].includes("/stories/reel/seen")) {
            // Assign an event listener
            this.addEventListener("load", event => {
                let response = JSON.parse(event.target.responseText);

                if (event.target.responseURL === "https://i.instagram.com/api/v1/feed/timeline/") {
                    response.feed_items.forEach(item => {
                        ParseMediaObjFromAPI(item.media_or_ad);
                    });
                }
                else if (event.target.responseURL.includes("https://www.instagram.com/graphql/query/")) {
                    const media = response.data.user?.edge_owner_to_timeline_media.edges;
                    if (media) {
                        media.forEach(edge => ParseMediaObjFromGraphQL(edge.node));
                    }
                }
                else if (event.target.responseURL.includes("https://www.instagram.com/explore/grid/")) {
                    let sections = response.sectional_items;
                    
                    sections.forEach(section => {
                        if (section.layout_type === "media_grid") {
                            section.layout_content.medias.forEach(media => ParseMediaObjFromAPI(media.media));
                        }
                        else if (section.layout_type.startsWith('two_by_two')) {
                            if (section.layout_content.two_by_two_item.channel) {
                                ParseMediaObjFromAPI(section.layout_content.two_by_two_item.channel.media);
                            }
                            else {
                                ParseMediaObjFromAPI(section.layout_content.two_by_two_item.media);
                            }
                            section.layout_content.fill_items.forEach(item => ParseMediaObjFromAPI(item.media));
                        }
                    });
                }
            }, false);
            // Call the stored reference to the native method
            XHR_open.apply(this, arguments);
        }
    };

    window.addEventListener('load', () => {
        const AllScripts = document.querySelectorAll('script');
        AllScripts.forEach(script => {
            if (script.innerHTML.startsWith("window.__additionalDataLoaded")) {
                let matches = /window\.__additionalDataLoaded\('.*',(.*)\);/.exec(script.innerHTML);
                if (matches[1]) {
                    if (matches[1].startsWith('{"items":')) {
                        let media = JSON.parse(matches[1])?.items;
                        if (media) {
                            media.forEach(item => ParseMediaObjFromAPI(item));
                        }
                    }
                    else if (matches[1].includes("feed_items")) {
                        let feed_items = JSON.parse(matches[1])?.feed_items;
                        if (feed_items) {
                            feed_items.forEach(item => ParseMediaObjFromAPI(item.media_or_ad));
                        }
                    }
                }
            }
        });
    });

    function ParseMediaObjFromGraphQL(media, save = true) {
        const postID = media.shortcode;

        if (media.__typename === "GraphSidecar") {
            let links = [];

            media.edge_sidecar_to_children.edges.forEach(edge => {
                let link = ParseMediaObjFromGraphQL(edge.node, false);
                links.push(link.src);
            });

            CapturedMediaURLs.push({ postID, srcs: links });
        }
        else if (media.is_video) {
            let src = media.video_url;
            if (src) {
                if (save) CapturedMediaURLs.push({ postID, src });
                return { postID, src };
            }
        }
        else if (media.__typename === "GraphImage") {
            let src = media.display_resources[media.display_resources.length - 1]?.src;
            if (src) {
                if (save) CapturedMediaURLs.push({ postID, src });
                return { postID, src };
            }
        }
    }

    function ParseMediaObjFromAPI(item, save = true) {
        const postID = item.code;
        
        if (item.carousel_media) {
            let links = [];

            item.carousel_media.forEach(media => {
                let link = ParseMediaObjFromAPI(media, false);
                links.push(link.src);
            });

            CapturedMediaURLs.push({ postID, srcs: links });
        }
        else if (item.video_versions) {
            let src = item.video_versions[item.video_versions.length - 1].url;
            if (save) CapturedMediaURLs.push({ postID, src });
            return { postID, src };
        }
        else if (item.image_versions2) {
            let src = item.image_versions2.candidates[0].url;
            if (save) CapturedMediaURLs.push({ postID, src });
            return { postID, src };
        }
    }
})();
