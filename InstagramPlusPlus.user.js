// ==UserScript==
// @name         Instagram++
// @namespace    maxhyt.instagrampp
// @version      4.8.5
// @description  Add addtional features to Instagram
// @author       Maxhyt
// @license      AGPL-3.0
// @icon         https://icons.duckduckgo.com/ip2/instagram.com.ico
// @homepage     https://github.com/ducng99/InstagramPP
// @match        https://www.instagram.com/*
// @match        https://static.ducng.dev/InstagramPP/
// @require      https://cdn.jsdelivr.net/npm/js-cookie@3.0/dist/js.cookie.min.js
// @require      https://cdn.jsdelivr.net/gh/golang/go@go1.21.6/misc/wasm/wasm_exec.min.js
// @run-at       document-start
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_addStyle
// @grant        GM_registerMenuCommand
// @grant        GM_xmlhttpRequest
// @grant        unsafeWindow
// ==/UserScript==

(function () {
    "use strict"

    const STORAGE_VARS = {
        BlockSeenStory: "block_seen_story", AutoReportSpamComments: "auto_report_spam_comments", DefaultVideoVolume: "default_video_volume",
        HideSponsoredPosts: "hide_sponsored_posts", EnlargeArticle: "enlarge_article",
        ReportedComments: "reported_comments",
    };

    const SETTINGS_PAGE = "https://static.ducng.dev/InstagramPP/";
    const REPORT_EXPIRE_TIME = 604800000; // 1 week

    let CapturedMediaURLs = {};
    let CapturedStoriesURLs = {};
    let ReportCommentsQueue = new Set();

    LoadSettings();

    // Loads IsCommentSpam WASM
    LoadIsCommentSpam();

    window.addEventListener('DOMContentLoaded', () => {
        // Handle initial scripts/data for articles
        const initialScripts = document.body.querySelectorAll("script");
        initialScripts.forEach(script => {
            try {
                if (script.innerHTML.startsWith("window.__additionalDataLoaded")) {
                    let matches = /window\.__additionalDataLoaded\('.+',(.+)\);/.exec(script.innerHTML);
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
                else if (script.innerHTML.includes("xdt_api__v1__media__shortcode__web_info")) {
                    const content = JSON.parse(script.innerHTML);
                    const items = content.require[0][3][0].__bbox.require[0][3][1].__bbox.result.data.xdt_api__v1__media__shortcode__web_info.items;
                    items.forEach(item => ParseMediaObjFromAPI(item));
                }
                else if (script.innerHTML.includes("discover\\/web\\/explore_grid")) {
                    const content = JSON.parse(script.innerHTML);
                    let response = content.require[0][3][0].__bbox.require[0][3][0].data.__bbox.result.response;
                    response = JSON.parse(response);

                    response.sectional_items.forEach(section => {
                        section.layout_content.one_by_two_item?.clips?.items?.forEach(item => ParseMediaObjFromAPI(item.media));
                        section.layout_content.fill_items?.forEach(item => ParseMediaObjFromAPI(item.media));
                    });
                }
                // Timeline feed initial script 2024-Jan-20
                else if (script.innerHTML.includes("xdt_api__v1__feed__timeline__connection")) {
                    const content = JSON.parse(script.innerHTML);
                    const nodes = content.require[0][3][0].__bbox.require[0][3][1].__bbox.result.data.xdt_api__v1__feed__timeline__connection.edges;
                    nodes.forEach(node => {
                        if (node.node.media) {
                            ParseMediaObjFromAPI(node.node.media);
                        } else if (node.node.explore_story?.media) {
                            // "Suggested for you" articles
                            ParseMediaObjFromAPI(node.node.explore_story.media);
                        }
                    });
                }
            }
            catch (ex) {
                console.error(ex);
            }
        });

        MainLoop();
        ReportLoop();
    });

    // Clear old reported comments
    const reportedComments = GetReportedComments();
    Object.entries(reportedComments).forEach(([key, value]) => {
        if (value < Date.now() - REPORT_EXPIRE_TIME) {
            delete reportedComments[key];
        }
    });

    GM_setValue(STORAGE_VARS.ReportedComments, JSON.stringify(reportedComments));

    // Enlarge news feed
    if (GM_getValue(STORAGE_VARS.EnlargeArticle)) {
        // News feed
        GM_addStyle(`
            div.x9f619.xjbqb8w.x78zum5.x168nmei.x13lgxp2.x5pf9jr.xo71vjh.x1uhb9sk.x1plvlek.xryxfnj.x1c4vz4f.x2lah0s.xdt5ytf.xqjyukv.x6s0dn4.x1oa3qoh.x1nhvcw1 > div.x9f619 {
                max-width: inherit !important;
                width: 100% !important;
            }

            article > div > div:nth-of-type(2) > div {
                min-width: 100%;
            }

            article div.x1qjc9v5.x972fbf.xcfux6l.x1qhh985.xm0m39n.x9f619.x78zum5.xdt5ytf.x2lah0s.xk390pu.xdj266r.x11i5rnm.xat24cr.x1mh8g0r.xexx8yu.x4uap5.x18d9i69.xkhd6sd.x1n2onr6.xggy1nq.x11njtxf {
                min-width: 100%;
            }

            article div.x1qjc9v5.x972fbf.xcfux6l.x1qhh985.xm0m39n.x9f619.x78zum5.xdt5ytf.x2lah0s.xk390pu.xdj266r.x11i5rnm.xat24cr.x1mh8g0r.xexx8yu.x4uap5.x18d9i69.xkhd6sd.x1n2onr6.xggy1nq.x11njtxf > div {
                width: 100% !important;
            }
        `);

        // Viewing single article
        GM_addStyle(`
            div.x6s0dn4.x78zum5.xdt5ytf.xdj266r.xkrivgy.xat24cr.x1gryazu.x1n2onr6.xh8yej3 {
                max-width: inherit !important;
            }
            div:has(> div.x6s0dn4.x78zum5.xdt5ytf.xdj266r.xkrivgy.xat24cr.x1gryazu.x1n2onr6.xh8yej3) {
                max-width: 95vh;
            }
        `);
    }

    function MainLoop() {
        const loop = () => {
            // Story
            let storyMenu = document.body.querySelector("._ac0m");
            if (storyMenu && !storyMenu.querySelector('.igpp_download')) {
                const newNode = document.createElement('div');
                newNode.innerHTML = '<button class="igpp_download x1i10hfl x6umtig x1b1mbwd xaqea5y xav7gou x9f619 xe8uvvx xdj266r x11i5rnm xat24cr x1mh8g0r x16tdsg8 x1hl2dhg xggy1nq x1a2a7pz x6s0dn4 xjbqb8w x1ejq31n xd10rxx x1sy0etr x17r0tee x1ypdohk x78zum5 xl56j7k x1y1aw1k x1sxyh0 xwib8y2 xurb0ha xcdnw81" type="button"><div class="x6s0dn4 x78zum5 xdt5ytf xl56j7k"><svg width="18" height="18" fill="#ffffff" color="#ffffff" class="x1lliihq x1n2onr6 x9bdzbf" viewBox="0 0 16 16" aria-label="Download"><path d="M8 2a5.53 5.53 0 0 0-3.594 1.342c-.766.66-1.321 1.52-1.464 2.383C1.266 6.095 0 7.555 0 9.318 0 11.366 1.708 13 3.781 13h8.906C14.502 13 16 11.57 16 9.773c0-1.636-1.242-2.969-2.834-3.194C12.923 3.999 10.69 2 8 2zm2.354 6.854-2 2a.5.5 0 0 1-.708 0l-2-2a.5.5 0 1 1 .708-.708L7.5 9.293V5.5a.5.5 0 0 1 1 0v3.793l1.146-1.147a.5.5 0 0 1 .708.708z"/></svg></div></button>';
                const downloadButton = newNode.firstChild;
                downloadButton.addEventListener('click', DownloadStory);
                storyMenu.insertBefore(downloadButton, storyMenu.firstChild);
            }

            // Video volume adjust
            document.body.querySelectorAll('video.x1lliihq.x5yr21d.xh8yej3:not([igpp_checked])').forEach(video => {
                if (video) {
                    video.setAttribute("igpp_checked", "");
                    video.volume = GM_getValue(STORAGE_VARS.DefaultVideoVolume / 100, 0.5);
                }
            });

            // Profile pic
            let profilePicContainer = document.body.querySelector('div.x9ozhqo.x9ozhqo ._aarf:not([igpp_checked])');
            if (profilePicContainer) {
                ProcessProfilePic(profilePicContainer.parentElement).then(() => profilePicContainer.setAttribute("igpp_checked", ""));
            }

            // News Feed
            // article: a long long time ago
            // div.x6s0dn4.x78zum5.xdt5ytf.xdj266r.xkrivgy.xat24cr.x1gryazu.x1n2onr6.xh8yej3 - Viewing article single page - 2024-Jan-29
            // #media-root - Viewing article w/ popup viewer - 2024-Feb-6
            let articles = document.body.querySelectorAll("article, div.x6s0dn4.x78zum5.xdt5ytf.xdj266r.xkrivgy.xat24cr.x1gryazu.x1n2onr6.xh8yej3, #media-root");
            articles.forEach(ProcessArticle);
        };

        setInterval(loop, 2000);
        loop();
    }

    function DownloadStory() {
        const storyID = /stories\/[a-z0-9._]+\/(\d+)/i.exec(window.location.href);

        if (storyID && storyID.length > 1) {
            const link = CapturedStoriesURLs[storyID[1]];

            if (link?.src) {
                window.open(link.src, "_blank");
            } else {
                alert("Cannot get the link");
            }
        } else {
            alert("Cannot get story ID");
        }
    }

    function ProcessArticle(article) {
        // Hide sponsored posts
        if (GM_getValue(STORAGE_VARS.HideSponsoredPosts)) {
            if (article.querySelector('header span.x5n08af.x1pg5gke.x132q4wb')) {
                article.children[0].style.display = 'none';
                return;
            }
        }

        // Download post's image/video
        let feedMenu = article.querySelector('section._aamu, div.x11i5rnm.x1gryazu');

        if (feedMenu && !feedMenu.querySelector('.igpp_download')) {
            let newNode = document.createElement("div");
            newNode.innerHTML = `<span class="igpp_download"><div><div aria-disabled="false" role="button" style="cursor: pointer;" tabindex="0"><button class="_abl-" type="button"><div class="_abm0"><svg class="x1lliihq x1n2onr6 x5n08af" fill="currentColor" role="img" width="24" height="24" viewBox="0 0 16 16" aria-label="Download"><path fill-rule="evenodd" d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5z"/><path fill-rule="evenodd" d="M7.646 11.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V1.5a.5.5 0 0 0-1 0v8.793L5.354 8.146a.5.5 0 1 0-.708.708l3 3z"/></svg></div></button></div></div></span>`;
            newNode.firstChild.addEventListener('click', () => {
                let src = GetMediaSrc(article);

                if (src) {
                    window.open(src, "_blank");
                }
                else {
                    alert('Error: Cannot find the link');
                }
            });
            feedMenu.appendChild(newNode.firstChild);

            // If menu bar is not section:
            if (feedMenu.tagName !== "SECTION") {
                feedMenu.style.display = "flex";
                feedMenu.style.alignItems = "center";
            }
        }

        // Report spam comments
        if (GM_getValue(STORAGE_VARS.AutoReportSpamComments) && 'isCommentSpam' in window) {
            const list_comments = article.querySelectorAll('ul._a9ym:not([igpp_checked]), ul._a9yo > div._aa06:not([igpp_checked])');
            const reportedComments = GetReportedComments();

            list_comments.forEach(comment_container => {
                const commentText = comment_container.querySelector('._a9zr > span, ._a9zs > span')?.textContent;
                const timeLink = comment_container.querySelector('a._a9zg._a6hd');
                const match = /\/p\/[a-z0-9-_]+\/c\/(\d+)/i.exec(timeLink?.href);

                if (commentText && timeLink && match && match[1]) {
                    const comment_id = match[1];
                    comment_container.setAttribute("igpp_checked", "");

                    if (!(comment_id in reportedComments)) {
                        if (window.isCommentSpam(commentText)) {
                            comment_container.remove();
                            ReportCommentsQueue.add(comment_id);
                        }
                    }
                    else {
                        comment_container.remove();
                    }
                }
            });
        }
    }

    function GetMediaSrc(article) {
        let mediaIndex = -1;
        const mediaCountDOM = article.querySelector("div._acvz._acnc");

        if (mediaCountDOM && mediaCountDOM.children.length > 1) {
            let current = mediaCountDOM.querySelector("._acnf");
            mediaIndex = [...mediaCountDOM.children].indexOf(current);
        }

        const dateDOM = article.querySelector("a[href^='/p/']");
        if (dateDOM) {
            const postID = /\/p\/([a-z0-9-_]+)/i.exec(dateDOM.href)[1];
            const linkR = CapturedMediaURLs[postID];

            if (linkR) {
                if (mediaIndex === -1) {
                    return linkR.src;
                }
                else {
                    return linkR.srcs[mediaIndex];
                }
            }
        }

        return null;
    }

    const XHR_open = XMLHttpRequest.prototype.open;
    const XHR_send = XMLHttpRequest.prototype.send;

    // START - Overwrite XMLHttpRequest methods
    XMLHttpRequest.prototype.open = function () {
        this.addEventListener("load", event => {
            try {
                let response = JSON.parse(event.target.responseText);

                // Timeline feed 2022-Dec-17
                if (event.target.responseURL === "https://www.instagram.com/api/v1/feed/timeline/") {
                    response.feed_items?.forEach(item => {
                        if (item.media_or_ad) {
                            ParseMediaObjFromAPI(item.media_or_ad);
                        }
                        else if (item.explore_story) {
                            ParseMediaObjFromAPI(item.explore_story.media_or_ad);
                        }
                    });
                }
                // Timeline feed 2022-Apr-21
                else if (event.target.responseURL.startsWith("https://www.instagram.com/graphql/query/")) {
                    response.data?.user?.edge_owner_to_timeline_media?.edges?.media?.forEach(edge => ParseMediaObjFromGraphQL(edge.node));
                }
                // Explore page 2023-Aug-20
                else if (event.target.responseURL.startsWith("https://www.instagram.com/api/v1/discover/web/explore_grid/")) {
                    response.sectional_items?.forEach(section => {
                        section.layout_content.one_by_two_item?.clips?.items?.forEach(item => ParseMediaObjFromAPI(item.media));
                        section.layout_content.fill_items?.forEach(item => ParseMediaObjFromAPI(item.media));
                    });
                }
                // Profile page 2023-Aug-20
                else if (event.target.responseURL.startsWith("https://www.instagram.com/api/v1/feed/user/")) {
                    response.items?.forEach(item => ParseMediaObjFromAPI(item));
                }
                else if (event.target.responseURL === "https://www.instagram.com/api/graphql") {
                    // Timeline feed 2024-Jan-20
                    response.data?.xdt_api__v1__feed__timeline__connection?.edges?.forEach(node => {
                        if (node.node.media) {
                            ParseMediaObjFromAPI(node.node.media);
                        } else if (node.node.explore_story?.media) {
                            ParseMediaObjFromAPI(node.node.explore_story.media);
                        }
                    });

                    // Article popup viewer (explore) 2024-Feb-6
                    response.data?.xdt_api__v1__media__shortcode__web_info?.items.forEach(item => ParseMediaObjFromAPI(item));
                }
                // Stories/reels 2024-Jan-25
                else if (event.target.responseURL.startsWith("https://www.instagram.com/api/v1/feed/reels_media")) {
                    response.reels_media?.forEach(reel => reel.items.forEach(ParseStoryMediaObjFromAPI));
                }
            }
            catch (err) {
                if (!(err instanceof SyntaxError)) {
                    console.error(err);
                }
            }
        }, false);

        // Call the stored reference to the native method
        XHR_open.apply(this, arguments);
    };

    XMLHttpRequest.prototype.send = function () {
        if (GM_getValue(STORAGE_VARS.BlockSeenStory) && typeof arguments[0] === 'string' && arguments[0].includes("PolarisAPIReelSeenMutation")) {
            this.abort();
            return;
        }

        XHR_send.apply(this, arguments);
    };
    // END - Overwrite XMLHttpRequest methods

    function ParseMediaObjFromGraphQL(media, save = true) {
        const postID = media.shortcode;

        if (media.__typename === "GraphSidecar") {
            let links = [];

            media.edge_sidecar_to_children.edges.forEach(edge => {
                let link = ParseMediaObjFromGraphQL(edge.node, false);
                links.push(link.src);
            });

            CapturedMediaURLs[postID] = { srcs: links };
        }
        else if (media.is_video) {
            let src = media.video_url;
            if (src) {
                if (save) CapturedMediaURLs[postID] = { src };
                return { postID, src };
            }
        }
        else if (media.__typename === "GraphImage") {
            let src = media.display_resources[media.display_resources.length - 1]?.src;
            if (src) {
                if (save) CapturedMediaURLs[postID] = { src };
                return { postID, src };
            }
        }
    }

    function ParseMediaObjFromAPI(item, save = true) {
        const postID = item.code ?? "";

        if (item.carousel_media) {
            let links = [];

            item.carousel_media.forEach(media => {
                let link = ParseMediaObjFromAPI(media, false);
                links.push(link.src);
            });

            CapturedMediaURLs[postID] = { srcs: links };
        }
        else if (item.video_versions) {
            let src = item.video_versions[item.video_versions.length - 1].url;
            if (save) CapturedMediaURLs[postID] = { src };
            return { src };
        }
        else if (item.image_versions2) {
            let src = item.image_versions2.candidates[0].url;
            if (save) CapturedMediaURLs[postID] = { src };
            return { src };
        }
    }

    function ParseStoryMediaObjFromAPI(item) {
        const storyID = item.pk ?? "";

        if (item.video_versions) {
            let src = item.video_versions[item.video_versions.length - 1].url;
            CapturedStoriesURLs[storyID] = { src };
        }
        else if (item.image_versions2) {
            let src = item.image_versions2.candidates[0].url;
            CapturedStoriesURLs[storyID] = { src };
        }
    }

    /* START - REPORT SPAM SECTION */
    function LoadIsCommentSpam() {
        let loadGoWasmInterval = 0;
        loadGoWasmInterval = setInterval(() => {
            if (window.Go) {
                clearInterval(loadGoWasmInterval);

                const go = new window.Go();
                GetICSWasm()
                    .then(wasmBuffer => WebAssembly.instantiate(wasmBuffer, go.importObject))
                    .then(result => { go.run(result.instance); })
                    .catch(err => { console.error(err); });
            }
        }, 1000);
    }

    function GetICSWasm() {
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: "GET",
                url: "https://github.com/ducng99/is-comment-spam-wasm/releases/latest/download/is-comment-spam.wasm",
                responseType: "arraybuffer",
                onload: function (response) {
                    resolve(response.response);
                },
                onerror: function (err) {
                    reject(err);
                }
            });
        });
    }

    function ReportLoop() {
        const loopId = setInterval(() => {
            if (GM_getValue(STORAGE_VARS.AutoReportSpamComments, false)) {
                if (ReportCommentsQueue.size > 0) {
                    const [id] = ReportCommentsQueue;
                    ReportCommentsQueue.delete(id);

                    SendReport(id).then(ok => {
                        if (ok) {
                            AddReportedComment(id);
                        }
                    });
                }
            } else {
                clearInterval(loopId);
            }
        }, 2000);
    }

    async function SendReport(comment_id) {
        const requestForm = new FormData;
        requestForm.append("entry_point", "1");
        requestForm.append("location", "3");
        requestForm.append("object_type", "2");
        requestForm.append("object_id", comment_id);
        requestForm.append("container_module", "postPage");
        requestForm.append("frx_prompt_request_type", "1");

        try {
            let res_report_request = await fetch("https://www.instagram.com/reports/web/get_frx_prompt/", {
                body: new URLSearchParams(requestForm),
                method: 'POST',
                headers: {
                    "X-CSRFToken": window.Cookies.get('csrftoken'),
                    "X-Instagram-AJAX": unsafeWindow._sharedData.rollout_hash,
                    "X-IG-App-ID": 936619743392459
                }
            });

            res_report_request = await res_report_request.json();

            if (res_report_request.status === "ok") {
                const context = res_report_request.response.context;

                const reportForm = new FormData;
                reportForm.append("context", context);
                reportForm.append("selected_tag_type", "ig_spam_v3");

                let res_report = await fetch("https://www.instagram.com/reports/web/log_tag_selected/", {
                    body: new URLSearchParams(reportForm),
                    method: 'POST',
                    headers: {
                        "X-CSRFToken": window.Cookies.get('csrftoken'),
                        "X-Instagram-AJAX": unsafeWindow._sharedData.rollout_hash,
                        "X-IG-App-ID": 936619743392459
                    }
                });
                res_report = await res_report.json();

                if (res_report.status === "ok") {
                    console.log(`Report ${comment_id} success`);
                    return true;
                }
                else {
                    console.error("Failed to send report", res_report);
                }
            }
            else {
                console.error("Failed to send report request", res_report_request);
            }
        }
        catch (ex) {
            console.error("Failed send report", ex);
        }

        return false;
    }

    function GetReportedComments() {
        return JSON.parse(GM_getValue(STORAGE_VARS.ReportedComments, "{}"));
    }

    function AddReportedComment(id) {
        let storedIDs = GetReportedComments();
        storedIDs[id] = Date.now();
        GM_setValue(STORAGE_VARS.ReportedComments, JSON.stringify(storedIDs));
    }

    /* END - REPORT SPAM SECTION */

    /* START - DOWNLOAD PROFILE PIC SECTION */
    async function ProcessProfilePic(container) {
        const match = window.location.pathname.match(/^\/([a-z0-9._]+)/i);
        if (match) {
            const username = match[1];

            try {
                let response = await fetch(`https://www.instagram.com/api/v1/users/web_profile_info/?username=${username}`, {
                    headers: {
                        "X-IG-App-ID": 936619743392459
                    }
                });
                response = await response.json();

                if (response?.data?.user?.id) {
                    const userID = response.data.user.id;

                    response = await fetch(`https://www.instagram.com/api/v1/users/${userID}/info/`, {
                        headers: {
                            "X-IG-App-ID": 936619743392459
                        },
                        credentials: 'include'
                    });
                    response = await response.json();

                    if (response?.user?.hd_profile_pic_url_info?.url) {
                        const profilePicURL = response.user.hd_profile_pic_url_info.url;

                        const tmpDOM = document.createElement("div");
                        tmpDOM.innerHTML = `<a href="${profilePicURL}" download="${username}.jpg" target="_blank" style="align-self: center; margin-top: 1em; text-decoration: none;"><button class="_acan _acap _acas">Download</button></a>`;
                        container.appendChild(tmpDOM.firstChild);
                    }
                }
            }
            catch (ex) {
                console.error("Failed to fetch profile pic for " + username, ex);
            }
        }
    }
    /* END - DOWNLOAD PROFILE PIC SECTION */

    /* START - SETTINGS SECTION */
    // Open settings page
    GM_registerMenuCommand("Settings", () => window.open(SETTINGS_PAGE, "_blank"));

    function LoadSettings() {
        // Set default settings if not exists
        if (GM_getValue(STORAGE_VARS.BlockSeenStory, null) === null) {
            GM_setValue(STORAGE_VARS.BlockSeenStory, true);
        }

        if (GM_getValue(STORAGE_VARS.AutoReportSpamComments, null) === null) {
            GM_setValue(STORAGE_VARS.AutoReportSpamComments, true);
        }

        if (GM_getValue(STORAGE_VARS.HideSponsoredPosts, null) === null) {
            GM_setValue(STORAGE_VARS.HideSponsoredPosts, true);
        }

        if (GM_getValue(STORAGE_VARS.RemoveBoldFont, null) === null) {
            GM_setValue(STORAGE_VARS.RemoveBoldFont, false);
        }

        if (GM_getValue(STORAGE_VARS.EnlargeArticle, null) === null) {
            GM_setValue(STORAGE_VARS.EnlargeArticle, false);
        }

        if (GM_getValue(STORAGE_VARS.DefaultVideoVolume, null) === null) {
            GM_setValue(STORAGE_VARS.DefaultVideoVolume, 50);
        }

        // Setup settings page
        if (window.location.href.startsWith(SETTINGS_PAGE)) {
            window.addEventListener('load', () => {
                const blockSeenStoryElement = document.getElementById(STORAGE_VARS.BlockSeenStory);
                const autoReportSpamCommentsElement = document.getElementById(STORAGE_VARS.AutoReportSpamComments);
                const hideSponsoredPostsElement = document.getElementById(STORAGE_VARS.HideSponsoredPosts);
                const enlargeArticleElement = document.getElementById(STORAGE_VARS.EnlargeArticle);
                const defaultVideoVolumeElement = document.getElementById(STORAGE_VARS.DefaultVideoVolume);

                if (blockSeenStoryElement) {
                    blockSeenStoryElement.checked = GM_getValue(STORAGE_VARS.BlockSeenStory);
                }

                if (autoReportSpamCommentsElement) {
                    autoReportSpamCommentsElement.checked = GM_getValue(STORAGE_VARS.AutoReportSpamComments);
                }

                if (hideSponsoredPostsElement) {
                    hideSponsoredPostsElement.checked = GM_getValue(STORAGE_VARS.HideSponsoredPosts);
                }

                if (enlargeArticleElement) {
                    enlargeArticleElement.checked = GM_getValue(STORAGE_VARS.EnlargeArticle);
                }

                if (defaultVideoVolumeElement) {
                    defaultVideoVolumeElement.value = GM_getValue(STORAGE_VARS.DefaultVideoVolume);
                }

                document.getElementById("save_settings")?.addEventListener('click', () => {
                    if (blockSeenStoryElement) {
                        GM_setValue(STORAGE_VARS.BlockSeenStory, blockSeenStoryElement.checked);
                    }
                    if (autoReportSpamCommentsElement) {
                        GM_setValue(STORAGE_VARS.AutoReportSpamComments, autoReportSpamCommentsElement.checked);
                    }
                    if (hideSponsoredPostsElement) {
                        GM_setValue(STORAGE_VARS.HideSponsoredPosts, hideSponsoredPostsElement.checked);
                    }
                    if (enlargeArticleElement) {
                        GM_setValue(STORAGE_VARS.EnlargeArticle, enlargeArticleElement.checked);
                    }
                    if (defaultVideoVolumeElement) {
                        GM_setValue(STORAGE_VARS.DefaultVideoVolume, defaultVideoVolumeElement.value);
                    }
                });
            });
        }
    }
    /* END - SETTINGS SECTION */
})();
