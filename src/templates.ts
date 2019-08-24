/* tslint:disable */
import * as models from "./models";
let md = require("markdown-it")();

export function generator(name: string): any {
    return name === "standard" ? standard : null;
}

function e(text: string) {
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#x27;').replace(/\//g, '&#x2F;');
}

function e2(text: string) {
    return text.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#x27;');
}

function standard(pageData: models.IPage) {
    const metaData = pageData.metaData ? pageData.metaData : {
        font1: "Damion",
        font2: "Rubik",
        banner: "C:/Users/Ollii-molli/Documents/Apps/blogscape/build/assets/standard/banner.jpg",
        themeColor1: "#000000",
        themeColor2: "#246bc7"
    };
    const data = pageData.data ? pageData.data : {
        title: "How to bake a bread",
        markdown: 
        `# Bake your own bread

        Baking bread is not easy!
        `
    };
    return (
        `<!DOCTYPE html>
        <html>

        <head>
            <title>${e(data.title)}</title>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">
            <link href="https://fonts.googleapis.com/css?family=${e(metaData.font1)}&display=swap" rel="stylesheet">
            <link href="https://fonts.googleapis.com/css?family=${e(metaData.font2)}&display=swap" rel="stylesheet">
            <style>
                html {
                    padding: 0;
                    margin: 0;
                    background-color: #ffffff;
                    width: 100%;
                }

                body {
                    padding: 0;
                    margin: 0;
                    background-color: #ffffff;
                    width: 100%;
                    min-height: 100%;
                    overflow-x: hidden;
                }

                .nav-bar {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 64px;
                    background-color: ${e(metaData.themeColor1)};
                    color: #ffffff;
                    font-family: '${e(metaData.font1)}';
                    font-size: 28px;
                    display: flex;
                    align-items: center;
                    justify-content: flex-start;
                    flex-direction: row;
                    transition: all 0.225s linear;
                    z-index: 1000;
                }

                .nav-bar-hidden {
                    background-color: #ffffff;
                    color: #000000;
                }

                .content {
                    height: 1000px
                }

                .scroll-hidden {
                    opacity: 0;
                    transform: translateY(70px);
                }

                .scroll-visible {
                    opacity: 1;
                    transform: translateY(0px);
                }

                .scroll-transition {
                    transition: all 1s ease-in-out;
                }

                .footer {
                    height: 200px;
                    width: 100%;
                    background-color: ${e(metaData.themeColor1)};
                }
            </style>
        </head>

        <body>
            <!-- NAVIGATION BAR -->
            <div class="nav-bar nav-bar-hidden" id="nav-bar">
                <div style="padding-left:12px">
                    ${e(data.title)}
                </div>
            </div>
            <!-- PAGE CONTENT -->
            <div class="content">
                <div style="padding-top: 86px">
                ${md.render(data.markdown)}
                </div>
                <div class="footer">

                </div>
            </div>
            <script>
                // NAVIGATION BAR LOGIC

                var navBarHidden = document.documentElement.scrollTop < 64;
                var ElNavBar = document.getElementById("nav-bar");

                function checkNavBarHidden() {
                    if (navBarHidden !== (document.documentElement.scrollTop < 64)) {
                        navBarHidden = document.documentElement.scrollTop < 64;
                        ElNavBar.classList.toggle("nav-bar-hidden");
                    }
                }

                // SHOW ON SCROLL LOGIC

                var hiddenElements = document.getElementsByName("scroll-hide");

                function checkScrollHidden() {
                    const bodyRect = document.body.getBoundingClientRect();
                    for (let i = hiddenElements.length - 1; i >= 0; i--) {
                        if (window.innerHeight + document.documentElement.scrollTop - 180 > (hiddenElements[i].getBoundingClientRect().top - bodyRect.top)) {
                            hiddenElements[i].classList.add("scroll-transition");
                            hiddenElements[i].classList.add("scroll-visible");
                        }
                    }
                }

                // PAGE INITIALIZING

                function init() {
                    if (!navBarHidden) {
                        ElNavBar.classList.toggle("nav-bar-hidden");
                    }
                    for (let i = hiddenElements.length - 1; i >= 0; i--) {
                        hiddenElements[i].classList.add("scroll-hidden");
                    }
                    window.addEventListener("scroll", checkNavBarHidden);
                    window.addEventListener("scroll", checkScrollHidden);
                    checkScrollHidden();
                }
                init()
            </script>
        </body>

        </html>
        `);
}
