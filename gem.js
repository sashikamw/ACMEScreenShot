const axios = require('axios');
//Your LambdaTest username
const username = process.env.username;
//Your LambdaTest accessToken
const accessToken = process.env.accesstoken;
axios.defaults.baseURL = 'https://api.lambdatest.com/screenshots/v1';
axios.defaults.headers.common['Authorization'] = "Basic " + Buffer.from(username + ":" + accessToken).toString('base64');
axios.defaults.headers.common['Content-Type'] = 'application/json';

class AttemptsExcededError extends Error {
    constructor(msg) {
        super(msg);
        this.name = 'AttemptsExcededError';
    }
}

const attemptsErr = new AttemptsExcededError('Max attempts exceeded');


//TODO Test stop test and user urls
async function checkTestStatus(testId) {

    try {
        const response = await axios.get("/" + testId, {
            timeout: 25000
        })
        return response.data

    } catch (error) {
        console.log("Error while calling get screenshots api statuscode:%d, message:%s ", error.response.status, JSON.stringify(error.response.data))
        return error

    }


}

function checkIfTestCompleted(testId) {
    return new Promise(function (resolve, reject) {
        let attempt = 0
        let teststatus = function (testId) {
            checkTestStatus(testId).then(function (response) {
                if (response.test_id) {
                    if (response.test_status === "completed" || response.test_status === "failed") {
                        resolve(response)
                    } else {
                        attempt++;
                        console.log("Test still running for testid:%s, url:%s", response.test_id, response.url)
                        if (attempt < 50) {
                            setTimeout(function () {
                                teststatus(testId)
                            }, 30000)
                        } else {
                            reject(attemptsErr)
                        }
                    }
                } else {
                    console.log("No data found for test_id", testId)
                    reject(Error(response))
                }

            }).catch(function (error) {
                console.log("Could not check test status reason:", error)
                reject(Error(error))
            });
        }
        teststatus(testId)
    });
}



async function takeScreenshot(payload) {

    try {
        const response = await axios.post("/", payload, {
            timeout: 25000
        })

        console.log("Test Started for url: %s, response:", payload.url, response.data)
        return response.data

    } catch (error) {
        console.log("Error while calling start screenshot test api message:%s ", JSON.stringify(error.response.data))
        throw error

    }

}

async function stopTest(testId) {

    try {
        const response = await axios.put("stop/" + testId, {
            timeout: 25000
        })
        console.log("Stop test api response :", response)

    } catch (error) {
        console.log("Error while calling get screenshots api message:", error)

    }


}


async function startTest() {

    //Array of all testIDS of completed tests
    let testIDS = [];
    //Your URLS for which to take screenshots
    let gemBaseUrl = "https://integration.askgem.com";
    let urls = ["/"]
    //Your OS and Browser configurations on which to take screenshots
    // Two seperate API calls simulated with smartscroll on and off, to avoid sticky header issue
    let osBrowserConfigWithSmartScroll = {
        "windows 10": {
          "chrome": [
            "79"
          ],
          "firefox": [
            "71"
          ],
          "edge": [
            "17"
          ]
        },
        "macos mojave": {
          "safari": [
            "12"
          ]
        }
      }

      let osBrowserConfigWithOutSmartScroll = {
        "windows 10": {
          "ie": [
            "11"
          ]
        },
        "ios 12.0": {
          "devices": [
            "iphone xr"
          ]
        },
        "ios 10.3": {
          "devices": [
            "iphone se"
          ]
        },
        "android 9.0": {
          "devices": [
            "galaxy s9 plus"
          ]
        }
      }
    
    let testPayloadWithSmartScroll = {}
    let testPayloadWithOutSmartScroll = {}

    for (var i = 0, len = urls.length; i < len; i++) {
        //console.log("With Smart Scroll");
        try {

            testPayloadWithSmartScroll = {
                defer_time: 3,
                email: false,
                layout: "portrait",
                mac_res: "1024x768",
                win_res: "1366X768",
                smart_scroll: true,
                url: gemBaseUrl + urls[i],
                configs: osBrowserConfigWithSmartScroll
            }


            response = await takeScreenshot(testPayloadWithSmartScroll)

            if (response && response.test_id) {

                try {
                    testOutput = await checkIfTestCompleted(response.test_id)
                    testIDS.push(testOutput.test_id)
                    console.log("Test Completed for url:%s with test_id:%s", urls[i], testOutput.test_id)
                } catch (error) {
                    console.log("Unable to check test status reason: ", error.message)
                    if (error instanceof AttemptsExcededError) {
                        console.log("Stopping tests using API")
                        await stopTest(response.test_id)
                    }

                }

            } else {
                console.log("Cannot check test status, reason:", response)
            }

        } catch (error) {
            console.log("Cannot call start test api reason:", error)
            break;
        }

        //Executing the second test round
         try {
            //console.log("Without Smart Scroll");
            testPayloadWithOutSmartScroll = {
                defer_time: 3,
                email: false,
                layout: "portrait",
                mac_res: "1024x768",
                win_res: "1366X768",
                smart_scroll: false,
                url: gemBaseUrl + urls[i],
                configs: osBrowserConfigWithOutSmartScroll
            }


            response = await takeScreenshot(testPayloadWithOutSmartScroll)

            if (response && response.test_id) {

                try {
                    testOutput = await checkIfTestCompleted(response.test_id)
                    testIDS.push(testOutput.test_id)
                    console.log("Test Completed for url:%s with test_id:%s", urls[i], testOutput.test_id)
                } catch (error) {
                    console.log("Unable to check test status reason: ", error.message)
                    if (error instanceof AttemptsExcededError) {
                        console.log("Stopping tests using API")
                        await stopTest(response.test_id)
                    }

                }

            } else {
                console.log("Cannot check test status, reason:", response)
            }

        } catch (error) {
            console.log("Cannot call start test api reason:", error)
            break;
        }

    }

    // for (var i = 0, len = urls.length; i < len; i++) {
    //     console.log("WithOut");
       

    // }

    console.log("TestIDs of all completed screenshot tests: ", testIDS)
    console.log("Done")

}




startTest()