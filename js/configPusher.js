/*Copyright 2019 Dynatrace LLC
Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at
http://www.apache.org/licenses/LICENSE-2.0
Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.*/

function ConfigPusherFactory(target, configPushType, configPushFile, customServiceTech=null, customMetricType=null) { //ConfigPusher factory, usage: var cp = ConfigPusherFactory("#viewport","AutoTag","config/MyAutoTag.json");
    let masterP = $.Deferred();
    //public data

    //private data
    let configData = {};
    let configured = false;
    let alternates = [];
    let $target = $(target);
    let $altSelect = {};
    let $button = {};

    //private methods
    function loadConfigJSON() {
        if (typeof selection == "undefined" ||
            typeof selection.config == "undefined" ||
            typeof selection.config.repo == "undefined")
            return;

        let file = `https://github.com/${file.repo.owner}/${file.repo.repo}/raw/master/${configPushFile}`;
        let p = $.get(file);

        $.when(p).done(function (data) {
            configData = data;
        })
        return p;
    }

    function checkForExistingConfig() {
        let c = configData;
        let p = {};

        switch (configPushType) {
            case "Autotag": {
                let query = `/api/config/v1/autoTags`;
                p = dtAPIquery(query);
                $.when(p).done(function (result) {
                    if (result.values.find(x => x.id === c.id && x.name === c.name)) {
                        configured = true;
                    } else {
                        configured = false;
                        alternates = result.values;
                    }
                });
                break;
            }
            case "MZ": {
                let query = `/api/config/v1/managementZones`;
                p = dtAPIquery(query);
                $.when(p).done(function (result) {
                    if (result.values.find(x => x.id === c.id && x.name === c.name)) {
                        configured = true;
                    } else {
                        configured = false;
                        alternates = result.values;
                    }
                });
                break;
            }
            case "RequestAttribute": {
                let query = `/api/config/v1/service/requestAttributes`;
                p = dtAPIquery(query);
                $.when(p).done(function (result) {
                    if (result.values.find(x => x.id === c.id && x.name === c.name)) {
                        configured = true;
                    } else {
                        configured = false;
                        alternates = result.values;
                    }
                });
                break;
            }
            case "CustomService": {
                let query = `/api/config/v1/service/customServices/${customServiceTech}`; //get tech from workflow creator
                p = dtAPIquery(query);
                $.when(p).done(function (result) {
                    if (result.values.find(x => x.id === c.id && x.name === c.name)) {
                        configured = true;
                    } else {
                        configured = false;
                        alternates = result.values;
                    }
                });
                break;
            }
            case "Extension": {
                let query = `/api/config/v1/extensions`;
                p = dtAPIquery(query);
                $.when(p).done(function (result) {
                    if (result.values.find(x => x.id === c.id && x.name === c.name)) {
                        configured = true;
                    } else {
                        configured = false;
                        alternates = result.values;
                    }
                });
                break;
            }
            case "CustomMetric": {
                let query = `/api/config/v1/calculatedMetrics/${customMetricType}`;
                p = dtAPIquery(query);
                $.when(p).done(function (result) {
                    if (result.values.find(x => x.id === c.id && x.name === c.name)) {
                        configured = true;
                    } else {
                        configured = false;
                        alternates = result.values;
                    }
                });
                break;
            }
            default: {
                console.log("unknown checkForExistingConfig type");
                break;
            }
        }
        return p;
    }

    function displayUserChoice() {
        let html = "";
        if (configured) {
            html = `<span>✅ ${configPushType} found.`;
            $target.html(html);
        } else {
            let buttonID = `button${uniqId()}`;
            let altID = `select${uniqId()}`;
            html = `<input type="button" id="${buttonID}" value="Push Config"><br>
            or choose alternate: <select id="${altID}></select>`;
            $target.html(html);
            $altSelect = $(altID);
            alternates.forEach(function (i) {
                let $opt = $("<option>");
                $opt.val(i.id)
                    .text(i.name)
                    .appendTo($altSelect);
            });
            $button = $(buttonID);
            $button.on("click", pushConfig);
        }
    }

    function pushConfig() {
        let c = configData;
        let p = {};

        switch (configPushType) {
            case "Autotag": {
                let query = `/api/config/v1/autoTags`;
                p = dtAPIquery(query, { method: "PUT", data: c });
                $.when(p).done(refreshConfigPusher);
                break;
            }
            case "MZ": {
                let query = `/api/config/v1/managementZones`;
                p = dtAPIquery(query, { method: "PUT", data: c });
                $.when(p).done(refreshConfigPusher);
                break;
            }
            case "RequestAttribute": {
                let query = `/api/config/v1/service/requestAttributes`;
                p = dtAPIquery(query, { method: "PUT", data: c });
                $.when(p).done(refreshConfigPusher);
                break;
            }
            case "CustomService": {
                let query = `/api/config/v1/service/customServices/${customServiceTech}`; //get tech from workflow creator
                p = dtAPIquery(query, { method: "PUT", data: c });
                $.when(p).done(refreshConfigPusher);
                break;
            }
            case "Extension": {
                let query = `/api/config/v1/extensions`;
                p = dtAPIquery(query, { method: "PUT", data: c });
                $.when(p).done(refreshConfigPusher);
                break;
            }
            case "CustomMetric": {
                let query = `/api/config/v1/calculatedMetrics/${customMetricType}`;
                p = dtAPIquery(query);
                $.when(p).done(function (result) {
                    if (result.values.find(x => x.id === c.id && x.name === c.name)) {
                        configured = true;
                    } else {
                        configured = false;
                        alternates = result.values;
                    }
                });
                break;
            }
            default: {
                console.log("unknown checkForExistingConfig type");
                break;
            }
        }
        return p;
    }

    //public methods
    function refreshConfigPusher() {
        let p1 = checkForExistingConfig();
        $.when(p1).done(displayUserChoice);
    }

    function addCPToSwaps(swaps,transform) {
        if(configured){
            addToSwaps(swaps, { from: transform+'.id', to: configData.id });
            addToSwaps(swaps, { from: transform+'.name', to: configData.name });
            addToSwaps(swaps, { from: transform+'.type', to: configPushType });
            if(customServiceTech!=null)addToSwaps(swaps, { from: transform+'.tech', to: customServiceTech });
            if(customMetricType!=null)addToSwaps(swaps, { from: transform+'.mtype', to: customMetricType });
        } else if(Object.entries($altSelect).length){
            let id = $altSelect.val();
            let name = $altSelect.find("option:selected").text();

            addToSwaps(swaps, { from: transform+'.id', to: id });
            addToSwaps(swaps, { from: transform+'.name', to: name });
            addToSwaps(swaps, { from: transform+'.type', to: configPushType });
            if(customServiceTech!=null)addToSwaps(swaps, { from: transform+'.tech', to: customServiceTech });
            if(customMetricType!=null)addToSwaps(swaps, { from: transform+'.mtype', to: customMetricType });
        } else {
            console.log("Tried to addToSwaps w/o configPusher ready");
        }
    }

    //constructor
    let p0 = loadConfigJSON();

    $.when(p0).done(function () {
        let p1 = checkForExistingConfig();

        $.when(p1).done(function () {
            displayUserChoice();

            masterP.resolve({ html: $html, refreshConfigPusher, addCPToSwaps});
        })
    });
    return masterP;
}