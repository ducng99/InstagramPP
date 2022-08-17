// ==UserScript==
// @name         Instagram++
// @namespace    maxhyt.instagrampp
// @version      4.4.11
// @description  Add addtional features to Instagram
// @author       Maxhyt
// @license      AGPL-3.0
// @icon         https://icons.duckduckgo.com/ip2/instagram.com.ico
// @homepage     https://github.com/ducng99/InstagramPP
// @match        https://www.instagram.com/*
// @match        https://static.ducng.dev/InstagramPP/
// @require      https://cdn.jsdelivr.net/npm/js-cookie@3.0.1/dist/js.cookie.min.js
// @run-at       document-start
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_registerMenuCommand
// @grant        GM_xmlhttpRequest
// @grant        unsafeWindow
// ==/UserScript==

(function () {
    "use strict"

    const STORAGE_VARS = {
        BlockSeenStory: "block_seen_story", AutoReportSpamComments: "auto_report_spam_comments", ShowHiddenLikesCount: "show_hidden_likes_count", DefaultVideoVolume: "default_video_volume",
        HideSponsoredPosts: "hide_sponsored_posts",
        ReportedComments: "reported_comments", CheckedComments: "checked_comments"
    };
    let CapturedMediaURLs = [];
    let ReportCommentsQueue = [];
    const SETTINGS_PAGE = "https://static.ducng.dev/InstagramPP/";
    const REPORT_EXPIRE_TIME = 604800000;   // 7 days

    LoadSettings();

    window.addEventListener('load', () => {
        const AllScripts = document.querySelectorAll('script');
        AllScripts.forEach(script => {
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
        });

        // Clear old reported comments
        const reportedComments = GetReportedComments();
        Object.entries(reportedComments).forEach(([key, value]) => {
            if (value < Date.now() - REPORT_EXPIRE_TIME) {
                delete reportedComments[key];
            }
        });

        GM_setValue(STORAGE_VARS.ReportedComments, JSON.stringify(reportedComments));

        MainLoop();
        ReportLoop();
    });

    async function MainLoop() {
        while (true) {
            // Story
            let storyMenu = document.body.querySelector("._ac0m");
            if (storyMenu && !storyMenu.querySelector('.igpp_download')) {
                const newNode = document.createElement('div');
                newNode.innerHTML = '<button class="_abl- igpp_download" type="button"><div class="_abm0"><svg width="18" height="18" fill="#ffffff" color="#ffffff" class="_ab6-" viewBox="0 0 16 16"><path d="M8 2a5.53 5.53 0 0 0-3.594 1.342c-.766.66-1.321 1.52-1.464 2.383C1.266 6.095 0 7.555 0 9.318 0 11.366 1.708 13 3.781 13h8.906C14.502 13 16 11.57 16 9.773c0-1.636-1.242-2.969-2.834-3.194C12.923 3.999 10.69 2 8 2zm2.354 6.854-2 2a.5.5 0 0 1-.708 0l-2-2a.5.5 0 1 1 .708-.708L7.5 9.293V5.5a.5.5 0 0 1 1 0v3.793l1.146-1.147a.5.5 0 0 1 .708.708z"/></svg></div></button>';
                const downloadButton = newNode.firstChild;
                downloadButton.addEventListener('click', DownloadStory);
                storyMenu.insertBefore(downloadButton, storyMenu.firstChild);
            }

            // Video
            [...document.body.querySelectorAll('video.tWeCl:not([igpp_checked])')].forEach(video => {
                if (video) {
                    video.setAttribute("igpp_checked", "");
                    video.volume = GM_getValue(STORAGE_VARS.DefaultVideoVolume / 100, 0.5);
                }
            });

            // Profile pic
            let profilePicContainer = document.body.querySelector('._aa_j:not([igpp_checked])');
            if (profilePicContainer) {
                await ProcessProfilePic(profilePicContainer);
                profilePicContainer.setAttribute("igpp_checked", "");
            }

            // News Feed
            let articles = [...document.body.querySelectorAll("article")];
            await Promise.all(articles.map(ProcessArticle));

            await Sleep(2000);
        }
    }

    function DownloadStory() {
        let stPicLink = document.body.querySelector("img._aa63._ac51")?.getAttribute("srcset")?.split(" ")[0];
        let stVidLink = document.body.querySelector("video._aa63._ac3u")?.querySelector("source")?.getAttribute("src");

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
        // Hide sponsored posts
        if (GM_getValue(STORAGE_VARS.HideSponsoredPosts)) {
            if (article.querySelector('header span._aays._aaqi')) {
                article.style.visibility = 'collapse';
                return;
            }
        }

        // Download post's image/video
        let feedMenu = article.querySelector('section._aamu');

        if (feedMenu && !feedMenu.querySelector('.igpp_download')) {
            let newNode = document.createElement("div");
            newNode.innerHTML = `<span class="igpp_download"><div><button class="_abl-"><svg width="24" height="24" viewBox="0 0 16 16" color="#262626" fill="#262626" aria-label="Download"><path fill-rule="evenodd" d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5z"/><path fill-rule="evenodd" d="M7.646 11.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V1.5a.5.5 0 0 0-1 0v8.793L5.354 8.146a.5.5 0 1 0-.708.708l3 3z"/></svg></button></div></span>`;
            newNode.firstChild.addEventListener('click', () => {
                let src = GetMediaSrc(article);

                if (src) {
                    window.open(src, "_blank");
                }
                else {
                    alert('Error: Cannot Find the link');
                }
            });
            feedMenu.appendChild(newNode.firstChild);
        }

        // Report spam comments
        if (GM_getValue(STORAGE_VARS.AutoReportSpamComments)) {
            const list_comments = article.querySelectorAll('ul._a9ym:not([igpp_checked]), ul._a9yo > div._aa06:not([igpp_checked])');
            const toBeCheckedComments = {};
            const IDsToElement = {};
            const reportedComments = GetReportedComments();

            list_comments.forEach(comment_container => {
                const commentText = comment_container.querySelector('._a9zr > span, ._a9zs > span')?.textContent;
                const timeLink = comment_container.querySelector('a._a9zg._a6hd');
                const match = /\/p\/[a-z0-9-_]+\/c\/(\d+)/i.exec(timeLink?.href);

                if (commentText && timeLink && match) {
                    comment_container.setAttribute("igpp_checked", "");

                    if (!(match[1] in reportedComments)) {
                        toBeCheckedComments[match[1]] = commentText;
                        IDsToElement[match[1]] = comment_container;
                    }
                    else {
                        comment_container.remove();
                    }
                }
            });

            const checkedCommentsResult = await CheckSpamComments(toBeCheckedComments);

            checkedCommentsResult.forEach(id => {
                if (IDsToElement[id]) {
                    IDsToElement[id].remove();
                }
                AddReportCommentID(id);
            });
        }

        // Show hidden likes count
        if (GM_getValue(STORAGE_VARS.ShowHiddenLikesCount)) {
            const likesCountURLDOM = article.querySelector("div._ab9m._ab9r._aba-._abbg._abby._abce a[href$='/liked_by/']");
            const likesCountDOM = likesCountURLDOM?.querySelector("div._aacl._aaco._aacw._aacx._aada._aade:not([igpp_checked])");

            if (likesCountDOM && !/[0-9.,]+/.test(likesCountDOM.textContent)) {
                const shortcode = likesCountURLDOM?.href.split("/")[4];

                await GetLikesCount(shortcode, likesCountDOM);
            }
        }
    }

    function GetMediaSrc(article) {
        let mediaIndex = -1;
        const mediaCountDOM = article.querySelector("div._acvz._acnc");

        if (mediaCountDOM && mediaCountDOM.children.length > 1) {
            let current = mediaCountDOM.querySelector("._acnf");
            mediaIndex = [...mediaCountDOM.children].indexOf(current);
        }

        const dateDOM = article.querySelector("a._aaqd._a6hd");
        if (dateDOM) {
            const linkR = CapturedMediaURLs.find(link => dateDOM.href.includes(link.postID));
            
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

    // Overwrite the native method
    XMLHttpRequest.prototype.open = function () {
        if (GM_getValue(STORAGE_VARS.BlockSeenStory) && arguments[1].includes("/stories/reel/seen")) {
            return;
        }

        this.addEventListener("load", event => {
            try {
                let response = JSON.parse(event.target.responseText);

                if (event.target.responseURL === "https://i.instagram.com/api/v1/feed/timeline/") {
                    response.feed_items.forEach(item => {
                        if (item.media_or_ad) {
                            ParseMediaObjFromAPI(item.media_or_ad);
                        }
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
                else if (event.target.responseURL.includes("https://i.instagram.com/api/v1/media/")) {
                    if (response.items && response.items[0]) {
                        ParseMediaObjFromAPI(response.items[0]);
                    }
                }
            }
            catch { }
        }, false);
        // Call the stored reference to the native method
        XHR_open.apply(this, arguments);
    };

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
        const postID = item.code ?? "";

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

    /* START - REPORT SPAM SECTION */

    async function ReportLoop() {
        while (GM_getValue(STORAGE_VARS.AutoReportSpamComments, false)) {
            const tmp_ReportCommentsQueue = [...ReportCommentsQueue];
            for (let i = 0; i < tmp_ReportCommentsQueue.length; i++) {
                const id = tmp_ReportCommentsQueue[i];
                ReportCommentsQueue.splice(ReportCommentsQueue.indexOf(id), 1);
                if (await SendReport(id)) {
                    AddReportedComment(id);
                }
                await Sleep(2000);
            }

            await Sleep(2000);
        }
    }

    async function CheckSpamComments(comments) {
        if (Object.keys(comments).length > 0) {
            try {
                const res = await gm_fetch("https://gateway.aws.ducng.dev/IsInstagramCommentSpam", {
                    body: JSON.stringify(comments),
                    method: 'POST'
                });

                if (res.status === 200)
                    return JSON.parse(res.responseText);
            }
            catch {
                console.error("Failed to connect to check spam API");
            }
        }

        return [];
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
                    "X-CSRFToken": Cookies.get('csrftoken'),
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
                        "X-CSRFToken": Cookies.get('csrftoken'),
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

    function AddReportCommentID(id) {
        ReportCommentsQueue = [...new Set([...ReportCommentsQueue, id])];
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
                let response = await fetch(`https://i.instagram.com/api/v1/users/web_profile_info/?username=${username}`, {
                    headers: {
                        "X-IG-App-ID": 936619743392459
                    }
                });
                response = await response.json();

                if (response?.data?.user?.id) {
                    const userID = response.data.user.id;

                    response = await fetch(`https://i.instagram.com/api/v1/users/${userID}/info/`, {
                        headers: {
                            "X-IG-App-ID": 936619743392459
                        },
                        credentials: 'include'
                    });
                    response = await response.json();

                    if (response?.user?.hd_profile_pic_url_info?.url) {
                        const profilePicURL = response.user.hd_profile_pic_url_info.url;

                        const tmpDOM = document.createElement("div");
                        tmpDOM.innerHTML = `<a href="${profilePicURL}" download="${username}.jpg" target="_blank" style="align-self: center; margin-top: 1em;"><button class="_acan _acap _acas">Download</button></a>`;
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

    /* START - GET LIKES COUNT */
    async function GetLikesCount(shortcode, likesCountDOM) {
        if (!likesCountDOM.hasAttribute("igpp_last_checked") || Number.parseInt(likesCountDOM.getAttribute("igpp_last_checked")) + 5000 > Date.now()) {
            likesCountDOM.setAttribute("igpp_last_checked", Date.now());
            const variables = JSON.stringify({ shortcode, include_reel: false, first: 0 });

            try {
                let response = await fetch(`https://www.instagram.com/graphql/query/?query_hash=d5d763b1e2acf209d62d22d184488e57&variables=${variables}`, {
                    headers: {
                        "X-IG-App-ID": 936619743392459,
                        "X-CSRFToken": Cookies.get('csrftoken'),
                    },
                    credentials: 'include'
                });

                response = await response.json();

                if (response?.data?.shortcode_media?.edge_liked_by?.count) {
                    let count = response.data.shortcode_media.edge_liked_by.count;

                    let numberDOM = document.createElement("span");
                    numberDOM.innerText = count.toLocaleString() + " ";
                    likesCountDOM.insertBefore(numberDOM, likesCountDOM.firstChild);
                    likesCountDOM.setAttribute("igpp_checked", "");
                }
            }
            catch (ex) {
                console.error(ex);
            }
        }
    }
    /* END - GET LIKES COUNT */

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

        if (GM_getValue(STORAGE_VARS.ShowHiddenLikesCount, null) === null) {
            GM_setValue(STORAGE_VARS.ShowHiddenLikesCount, true);
        }

        if (GM_getValue(STORAGE_VARS.HideSponsoredPosts, null) === null) {
            GM_setValue(STORAGE_VARS.HideSponsoredPosts, true);
        }

        if (GM_getValue(STORAGE_VARS.DefaultVideoVolume, null) === null) {
            GM_setValue(STORAGE_VARS.DefaultVideoVolume, 50);
        }

        // Setup settings page
        if (window.location.href.includes(SETTINGS_PAGE)) {
            window.addEventListener('load', () => {
                document.getElementById(STORAGE_VARS.BlockSeenStory).checked = GM_getValue(STORAGE_VARS.BlockSeenStory);
                document.getElementById(STORAGE_VARS.AutoReportSpamComments).checked = GM_getValue(STORAGE_VARS.AutoReportSpamComments);
                document.getElementById(STORAGE_VARS.ShowHiddenLikesCount).checked = GM_getValue(STORAGE_VARS.ShowHiddenLikesCount);
                document.getElementById(STORAGE_VARS.HideSponsoredPosts).checked = GM_getValue(STORAGE_VARS.HideSponsoredPosts);
                document.getElementById(STORAGE_VARS.DefaultVideoVolume).value = GM_getValue(STORAGE_VARS.DefaultVideoVolume);

                document.querySelector("#save_settings").addEventListener('click', () => {
                    GM_setValue(STORAGE_VARS.BlockSeenStory, document.getElementById(STORAGE_VARS.BlockSeenStory).checked);
                    GM_setValue(STORAGE_VARS.AutoReportSpamComments, document.getElementById(STORAGE_VARS.AutoReportSpamComments).checked);
                    GM_setValue(STORAGE_VARS.ShowHiddenLikesCount, document.getElementById(STORAGE_VARS.ShowHiddenLikesCount).checked);
                    GM_setValue(STORAGE_VARS.HideSponsoredPosts, document.getElementById(STORAGE_VARS.HideSponsoredPosts).checked);
                    GM_setValue(STORAGE_VARS.DefaultVideoVolume, document.getElementById(STORAGE_VARS.DefaultVideoVolume).value);
                });
            });
        }
    }
    /* END - SETTINGS SECTION */

    function Sleep(time) {
        return new Promise(resolve => setTimeout(() => resolve(), time));
    }

    function gm_fetch(url, options) {
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: options.method || 'GET',
                url: url,
                headers: options.headers || {},
                data: options.body || null,
                anonymous: true,
                onload: (res) => {
                    if (res.status >= 200 && res.status < 300) resolve(res);
                    else reject(res);
                },
                onerror: reject
            });
        });
    }
})();
