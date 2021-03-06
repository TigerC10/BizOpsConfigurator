/*Copyright 2019 Dynatrace LLC
Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at
http://www.apache.org/licenses/LICENSE-2.0
Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.*/

function loadUsqlQuery($usql) {
    $usql = $($usql);
    let usql = $usql.val();
    let slicer = $usql.siblings(".usqlResultSlicer").val();
    let whereClause = ($usql.siblings(".usqlResultSlicer[data-addWhereClause]").attr("data-addWhereClause") === 'true') ?
        true : false;
    let $target = $usql.siblings(".workflowSelect");
    if (typeof selection.swaps !== "undefined") usql = queryDoSwaps(usql, selection.swaps);
    if (!usql.match(/^SELECT /i)) {
        console.log(`invalid usql query: ${usql}`);
        return;
    }
    let query = "/api/v1/userSessionQueryLanguage/table?query=" + encodeURIComponent(usql) + "&explain=false";
    let p1 = loadUsqlQueryOptions(query, slicer, $target, whereClause);
    return $.when(p1).done(function (data) {
        jsonviewer(data);
    });
}

function loadUsqlQueryOptions(query, slicer, target, whereClause) {
    let $target = $(target);
    let p = dtAPIquery(query);
    return $.when(p).done(function (data) {
        jsonviewer(data, true, "", "#apiResult");
        let parsedResults = sliceUSQLdata(slicer, data, $target, whereClause);
        $target.removeAttr("disabled");
    });
}

function sliceUSQLdata(slicer, data, target, whereClause) { //TODO: refactor this bowl of spaghetti
    let $target = $(target);
    let parsedResults = [];

    if ($target.is("select")) { //TODO: clean-up, currently creating one level too far down
        let $div = $("<div class='flex'></div>");
        $div.replaceAll($target);
        $target = $div;  //here target is actually a div containing multiple selects
    }

    let from = $("#transform").val();
    switch (slicer) {
        case 'Keys': {
            let selectors = [`#usp${uniqId()}`];
            $target.html(`
                <div class="inputHeader"><!--Keys:--></div>
                <div class="userInput"><select id="${selectors[0].substr(1)}"><option></option></select></div>
                `);
            parsedResults = parseKPIs(data);
            /*let options = drawKPIs(parsedResults);
            $(`${selectors[0]}`).html(options);*/
            drawKPIsJQ(parsedResults, selectors[0]);
            $("#swaps").html();

            if (whereClause) {
                let targetSelector = `#filterClause${uniqId()}`;
                $target.append(`<div class="inputHeader">Where Clause:</div>
                <div class="userInput"><input disabled id="${targetSelector.substr(1)}" class="filterClause"></div>
                `);
                let eventData = { selectors: selectors, data: parsedResults, targetSelector: targetSelector };
                $target.on("change", "select", eventData, previewChangeHandlerKeyWhereClause);
                $target.find("select:first-of-type").trigger("change");
            } else {
                let eventData = { selectors: selectors, data: parsedResults, targetSelector: '' };
                $target.on("change", "select", eventData, previewChangeHandlerKey);
                $target.find("select:first-of-type").trigger("change");
            }
            break;
        }
        case 'Keys/Values': {
            let selectors = [`#uspKey${uniqId()}`, `#uspVal${uniqId()}`];
            parsedResults = parseUSPFilter(data);
            $target.html(`
                <div class="inputHeader">Keys:</div>
                <div class="userInput"><select id="${selectors[0].substr(1)}"><option></option></select></div>
                <div class="inputHeader">Values:</div>
                <div class="userInput"><select id="${selectors[1].substr(1)}"><option></option></select></div>
                `);
            $("#swaps").html(`
                <div class="inputHeader">From:</div>
                <div class="userInput">${'${' + from + '}'}</div>
            `);

            if (whereClause) {
                let targetSelector = `#filterClause${uniqId()}`;
                $target.append(`<div class="inputHeader">Where Clause:</div>
                <div class="userInput"><input disabled id="${targetSelector.substr(1)}" class="filterClause"></div>
                `);
                let eventData = { selectors: selectors, data: parsedResults, targetSelector: targetSelector };
                $target.on("change", "select", eventData, uspFilterChangeHandler);
                $target.find("select:first-of-type").trigger("change");
            } else {
                let targetSelector = '';
                let eventData = { selectors: selectors, data: parsedResults, targetSelector: targetSelector };
                $target.on("change", "select", eventData, previewChangeHandlerKeyVal);
                $target.find("select:first-of-type").trigger("change");
            }
            break;
        }
        case 'ValX3': {
            let selectors = [`#continent${uniqId()}`, `#country${uniqId()}`, `#region${uniqId()}`, `#city${uniqId()}`];
            parsedResults = parseRegions(data);
            $target.html(`
                <div class="inputHeader">Values:</div>
                <div class="userInput"><select id="${selectors[0].substr(1)}" class="continentList"><option></option></select></div>
                <div class="inputHeader">Values:</div>
                <div class="userInput"><select id="${selectors[1].substr(1)}" class="countryList"><option></option></select></div>
                <div class="inputHeader">Values:</div>
                <div class="userInput"><select id="${selectors[2].substr(1)}" class="regionList"><option></option></select></div>
                <div class="inputHeader">Values:</div>
                <div class="userInput"><select id="${selectors[3].substr(1)}" class="cityList"><option></option></select></div>
                `);
            $("#swaps").html(`
                <div class="inputHeader">From:</div>
                <div class="userInput">${'${' + from + '}'}</div>
            `);
            if (whereClause) {
                let targetSelector = `#filterClause${uniqId()}`;
                $target.append(`<div class="inputHeader">Where Clause:</div>
                <div class="userInput"><input disabled id="${targetSelector.substr(1)}" class="filterClause"></div>
                `);
                let eventData = { selectors: selectors, data: parsedResults, targetSelector: targetSelector };
                $target.on("change", "select", eventData, previewChangeHandlerValX4Where);
                $target.find("select:first-of-type").trigger("change");
            } else {
                let eventData = { selectors: selectors, data: parsedResults, targetSelector: null };
                $target.on("change", "select", eventData, previewChangeHandlerValX4);
                $target.find("select:first-of-type").trigger("change");
            }
            break;
        }
        case "actions": {
            let selectors = [`#action${uniqId()}`];

            let colname = data.columnNames[0];
            $target.html(`
                <div class="inputHeader"><!--Actions:--></div>
                <div class="userInput"><select id="${selectors[0].substr(1)}" data-colname="${colname}">
                    <option></option></select></div>
                `);
            let options = drawActions(data);
            $(`${selectors[0]}`).html(options);
            $("#swaps").html();

            if (whereClause) {
                let targetSelector = `#filterClause${uniqId()}`;
                $target.append(`<div class="inputHeader">Where Clause:</div>
                <div class="userInput"><input disabled id="${targetSelector.substr(1)}" class="filterClause"></div>
                `);
                let eventData = { selectors: selectors, data: parsedResults, targetSelector: targetSelector };
                $target.on("change", "select", eventData, previewChangeHandlerActionWhereClause);
                $target.find("select:first-of-type").trigger("change");
            } else {
                let eventData = { selectors: selectors, data: parsedResults, targetSelector: '' };
                $target.on("change", "select", eventData, previewChangeHandlerAction);
                $target.find("select:first-of-type").trigger("change");
            }
            break;
        }
    }
    return parsedResults;
}


function previewChangeHandlerKey(event) {
    let $el = $(event.data.selectors[0]);

    let $option = $el.find("option:selected");
    //let val = $option.attr("data-colname") + "." + $option.val();
    let val = $option.val();
    let key = $option.text();
    let fromkey = "${" + $("#transform").val() + ".name}";
    let fromval = "${" + $("#transform").val() + ".id}";

    let xform = `<table class="dataTable">
        <thead><tr><td>From</td><td>To</td></tr></thead>
        <tr><td>${fromkey}</td><td>${key}</td></tr>
        <tr><td>${fromval}</td><td>${val}</td></tr>
        </table>`;
    $("#swaps").html(xform);
}

function previewChangeHandlerKeyWhereClause(event) {
    let $el = $(event.data.selectors[0]);
    let $target = $(event.data.targetSelector);

    let $option = $el.find("option:selected");
    let val = $option.val();
    let from = "${" + $("#transform").val() + "}";

    let filters = [];
    if (val != null && val != '' && val != 'n/a')
        filters.push(val + ' is not null');

    let filterClause = filters.length > 0 ?
        " AND (" + filters.join(" AND ") + ")" :
        "";
    $target.val(filterClause);

    let preview = $(`<table class="dataTable">`);
    preview.append(`<thead><tr><td>From</td><td>To</td></tr></thead>`);
    preview.append(`<tr><td>${from}</td><td>${filterClause}</td></tr>`);
    $("#swaps").html(preview);
}

function previewChangeHandlerAction(event) {
    let $el = $(event.data.selectors[0]);

    let $option = $el.find("option:selected");
    //let val = $option.attr("data-colname") + "." + $option.val();
    let val = $option.val();
    let from = "${" + $("#transform").val() + "}";

    let preview = $(`<table class="dataTable">`);
    preview.append(`<thead><tr><td>From</td><td>To</td></tr></thead>`);
    preview.append(`<tr><td>${from}</td><td>${val}</td></tr>`);
    $("#swaps").html(preview);
}

function previewChangeHandlerActionWhereClause(event) {
    let $el = $(event.data.selectors[0]);
    let $target = $(event.data.targetSelector);

    let $option = $el.find("option:selected");
    let colname = $el.attr("data-colname");
    let val = $option.val();
    let from = "${" + $("#transform").val() + "}";

    let filters = [];
    if (val != null && val != '' && val != 'n/a')
        filters.push(`${colname}="${val}"`);

    let filterClause = filters.length > 0 ?
        " AND (" + filters.join(" AND ") + ")" :
        "";
    $target.val(filterClause);

    let preview = $(`<table class="dataTable">`);
    preview.append(`<thead><tr><td>From</td><td>To</td></tr></thead>`);
    preview.append(`<tr><td>${from}</td><td>${filterClause}</td></tr>`);
    $("#swaps").html(preview);
}

function previewChangeHandlerKeyVal(event) {
    uspFilterChangeHandler(event);

    let key = $(event.data.selectors[0]).val();
    let val = $(event.data.selectors[1]).val();

    let fromkey = "${" + $("#transform").val() + ".key}";
    let fromval = "${" + $("#transform").val() + ".value}";

    let preview = $(`<table class="dataTable">`);
    preview.append(`<thead><tr><td>From</td><td>To</td></tr></thead>`);
    preview.append(`<tr><td>${fromkey}</td><td>${key}</td></tr>`);
    preview.append(`<tr><td>${fromval}</td><td>${val}</td></tr>`);
    $("#swaps").html(preview);
}

function previewChangeHandlerValX4(event) {
    regionsChangeHandler(event);

    let val1 = $(event.data.selectors[0]).val();
    let val2 = $(event.data.selectors[1]).val();
    let val3 = $(event.data.selectors[2]).val();
    let val4 = $(event.data.selectors[3]).val();

    let from1 = "${" + $("#transform").val() + ".1}";
    let from2 = "${" + $("#transform").val() + ".2}";
    let from3 = "${" + $("#transform").val() + ".3}";
    let from4 = "${" + $("#transform").val() + ".4}";

    let preview = $(`<table class="dataTable">`);
    preview.append(`<thead><tr><td>From</td><td>To</td></tr></thead>`);
    preview.append(`<tr><td>${from1}</td><td>${val1}</td></tr>`);
    preview.append(`<tr><td>${from2}</td><td>${val2}</td></tr>`);
    preview.append(`<tr><td>${from3}</td><td>${val3}</td></tr>`);
    preview.append(`<tr><td>${from4}</td><td>${val4}</td></tr>`);
    $("#swaps").html(preview);
}

function previewChangeHandlerValX4Where(event) {
    regionsChangeHandler(event);

    let val = $(event.data.targetSelector).val();

    let from = "${" + $("#transform").val() + "}";

    let preview = $(`<table class="dataTable">`);
    preview.append(`<thead><tr><td>From</td><td>To</td></tr></thead>`);
    preview.append(`<tr><td>${from}</td><td>${val}</td></tr>`);
    $("#swaps").html(preview);
}

function usqlCommonQueryChangeHandler() {
    let commonQueries = $("#usqlCommonQueries").val();

    switch (commonQueries) {
        case "Double/Long USPs":
            $("#usqlQuery").val('SELECT usersession.longProperties, usersession.doubleProperties FROM useraction WHERE useraction.application IN ("${app.name}") LIMIT 5000');
            $("#usqlResultSlicer").val("Keys");
            $("#transform").val("usp");
            $("#addWhereClause").prop("checked", false);
            break;
        case "String/Date USPs":
            $("#usqlQuery").val('SELECT usersession.stringProperties, usersession.dateProperties FROM useraction WHERE useraction.application IN ("${app.name}") LIMIT 5000');
            $("#usqlResultSlicer").val("Keys/Values");
            $("#transform").val("uspClause");
            $("#addWhereClause").prop("checked", false);
            break;
        case "Regions":
            $("#usqlQuery").val('SELECT DISTINCT continent, country, region, city FROM usersession WHERE useraction.application IN ("${app.name}") ORDER BY country,region,city LIMIT 5000');
            $("#usqlResultSlicer").val("ValX3");
            $("#transform").val("regionClause");
            $("#addWhereClause").prop("checked", true);
            break;
        case "Key User Actions":
            $("#usqlQuery").val('SELECT useraction.name FROM useraction WHERE useraction.application IN ("${app.name}") AND keyUserAction = true LIMIT 5000');
            $("#usqlResultSlicer").val("actions");
            $("#transform").val("kua");
            $("#addWhereClause").prop("checked", true);
            break;
        case "Conversion Goals":
            $("#usqlQuery").val('SELECT useraction.matchingConversionGoals FROM useraction WHERE useraction.application IN ("${app.name}") AND matchingConversionGoals IS NOT NULL LIMIT 5000');
            $("#usqlResultSlicer").val("actions");
            $("#transform").val("goal");
            $("#addWhereClause").prop("checked", true);
            break;
    }
}

function previewUSQLhandler() {
    let p0 = getConnectInfo();

    $.when(p0).done(function () {
        let p1 = getTestApp();

        $.when(p1).done(function (app) {
            let usql = $("#usqlQuery").val();
            usql = usql.replace("${app.name}", app.name);
            usql = usql.replace("${app.id}", app.id);
            let query = "/api/v1/userSessionQueryLanguage/table?query=" + encodeURIComponent(usql) + "&explain=false";
            let slicer = $("#usqlResultSlicer").val();
            let whereClause = $("#addWhereClause").is(":checked");
            let $target = $("#preview");
            $("#apiQueryHeader").text(query);
            let p2 = loadUsqlQueryOptions(query, slicer, $target, whereClause);
            $.when(p2).done(function (data) {
                jsonviewer(data, true, "", "#apiResult");
                $(".chosen-select").chosen();
            });
        });
    });
}
