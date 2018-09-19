 /*
 ## eventmultiline module
 * For tutorial on how to create a custom Banana module.
 */
define([
        'angular',
        'app',
        'underscore',
        'jquery',
        'd3',
        'kbn',
        'config',
        './d3.tip',
        'panels/map/lib/map.world.codes'
    ],
    function (angular, app, _, $, d3, kbn, config, d3tip, worldmap) {
        'use strict';

        var module = angular.module('kibana.panels.eventmultiline', []);
        app.useModule(module);
        var dataSize = 0;
        //var parseDate = d3.time.format("%Y%m%d").parse;
        var parseDate = d3.time.format('%Y-%m-%dT%H:%M:%SZ').parse;
        module.controller('eventmultiline', function ($http, $scope, dashboard, querySrv, filterSrv, $rootScope) {
            $scope.panelMeta = {
                modals: [
                    {
                        description: 'Information',
                        icon: 'icon-info-sign',
                        partial: 'app/partials/inspector.html',
                        show: $scope.panel.spyable
                    }
                ],
                //editorTabs: [
                //  {
                //    title: 'Queries',
                //    src: 'app/partials/querySelect.html'
                //  }
                //],
                exportfiletocsv:true,
                status: '',
                description: 'Line chart with events'
            };

            // Define panel's default properties and values
            var _d = {
                queries: {
                    mode: 'all',
                    query: '*:*',
                    custom: ''
                },
                field: '',
                max_rows: 10,
                spyable: true,
                show_queries: true,
                info_description: 'Event Multiline Chart.',
                selectedSolrCollection: "",
                //solrCollectionList:[],
                dataSourceList: [],
                selectedDataSource: {name: ''},
                selectedDataType: {},
            };

            // Set panel's default values
            _.defaults($scope.panel, _d);

            if (typeof $scope.panel.selectedSolrCollection === "undefined") $scope.panel.selectedSolrCollection = "";
            if (typeof $scope.panel.solrCollectionList === "undefined") $scope.panel.solrCollectionList = [];

            $scope.panel.solrCollectionList = [];
            $scope.panel.dataSourceList = [];

            for (var item in $scope.userSolrCollection) {
                $scope.panel.dataSourceList.push(config[$scope.userSolrCollection[item].collectionName]);
            }
            if ($scope.panel.selectedDataSource.name === "") {
                for (var item in $scope.userSolrCollection) {
                    if ($scope.userSolrCollection[item].isDefault == 1) {
                        $scope.panel.selectedDataSource.name = config[$scope.userSolrCollection[item].collectionName];
                    }
                }
            }

            // TODO Need to make the "solrCollectionDataTypes" dynamic based on if user has access
            $scope.solrCollectionDataTypes = [{
                name: "wsi_proxy",
                options: ["Page view", "Page hit"]
            }];

            //var parseDate = d3.time.format("%Y%m%d").parse;
            //var dataSize = 0;
            $scope.markers = {};

           $scope.converttousdatetime = function(inputString) {
			        var tempdate = new Date(inputString);
                    var year = tempdate.getFullYear();
                    var month = tempdate.getMonth() + 1;
                    var day = tempdate.getDate();
                    var hours = tempdate.getHours();
                    var minutes = tempdate.getMinutes();
                    var seconds = tempdate.getSeconds();
                    month = $scope.convertto2char(month);
                    day = $scope.convertto2char(day);
                    hours = $scope.convertto2char(hours);
                    minutes = $scope.convertto2char(minutes);
                    seconds = $scope.convertto2char(seconds);
                    var result = month + "/" + day + "/" + year + " " + hours + ":" + minutes + ":" + seconds ;
                    return result;					
			} 
            $scope.convertto2char = function(inputString){
               inputString = inputString.toString();
               var result = "";
               if (inputString.length ==1 ){
                  result = "0"+inputString;
               }else{
                  result = inputString;
               }
               return result;
            }
            $scope.exportfiletocsv = function() {
                //console.log(countryCodes);
 
                var tempdata = $scope.data;
                var headerArray = Object.keys(tempdata[0]);
                var response = "";
                var invertedCountryCodes = _.invert(countryCodes);
                console.log(invertedCountryCodes); 
                for (var item in headerArray) {
                    
                    if (item == 0) {
                        response = "Date"; //,headerArray[item];
                    } else {
                        var tempCountryCode = headerArray[item];
                        //tempCountryCode = tempCountryCode.toUpperCase();
                        //console.log(tempCountryCode);
                        //console.log(invertedCountryCodes[tempCountryCode]);
                        //var countryName = invertedCountryCodes[tempCountryCode];
                        //if (countryName === undefined) countryName = tempCountryCode;
                        response += "," + headerArray[item]; 
                    }                 
                } 
                response += "\n";
                for (var item in tempdata) {
                    var aline = "";
                    var eachdata = tempdata[item];
                    for (var item2 in eachdata) {
                        //console.log(item2);
                        if (item2 == "date" ) {
                            aline = $scope.converttousdatetime(eachdata[item2]);  
                        } else {
                            aline += "," + eachdata[item2];
                        } 
                    } 
                    aline += "\n";
                    response += aline;                    
                }
                
                var basename = $scope.panel.title + "-" + $scope.panel.selectedDataSource.name + "-" + $scope.panel.selectedDataType;
                kbn.download_response_to_csv(response,basename);
            }






            $scope.init = function () {
                $scope.panel.interval = null;
                $scope.panel.span = 12;
                $scope.$on('refresh', function () {
                    $scope.get_data();
                });
                $scope.get_data();
            };

            $scope.get_time_range = function () {
                var range = $scope.range = filterSrv.timeRange('min');
                return range;
            };

            $scope.get_interval = function () {
                var interval = $scope.panel.interval,
                    range;
                //if ($scope.panel.auto_int) {
                range = $scope.get_time_range();
                if (range) {
                    interval = kbn.secondsToHms(
                        kbn.calculate_interval(range.from, range.to, $scope.panel.resolution, 0) / 1000
                    );
                }
                //}
                $scope.panel.interval = interval || '10m';
                return $scope.panel.interval;
            };


            // For return query by different combination of collection and data type)
          

            $scope.set_refresh = function (state) {
                $scope.refresh = state;
            };

            $scope.close_edit = function () {
                if ($scope.refresh) {
                    $scope.get_data();
                }
                $scope.refresh = false;
                $scope.$emit('render');
            };

            $scope.render = function () {
                $scope.$emit('render');
            };

            $scope.get_data = function () {
                // Show the spinning wheel icon
                delete $scope.panel.error;
                $scope.panelMeta.loading = true;
                // Set Solr server
                var _range = $scope.get_time_range();
                var _interval = $scope.get_interval(_range);

                //if ($scope.panel.auto_int) {
                $scope.panel.interval = kbn.secondsToHms(
                    kbn.calculate_interval(_range.from, _range.to, 100, 0) / 1000);
                //}
                if ($scope.panel.interval.indexOf("s") >= 0) {
                    $scope.panel.interval = "1m"
                }
                ;  // the smallest gap is 1min
                $scope.panel.selectedSolrCollection = config[$scope.panel.selectedDataSource.name];
                $scope.sjs.client.server(dashboard.current.solr.server + $scope.panel.selectedSolrCollection);
                //$scope.sjs.client.server(dashboard.current.solr.server + dashboard.current.solr.core_name);
                //$scope.sjs.client.server(dashboard.current.solr.server + "bbg_proxy_web_collection");
                $scope.sjs.client.addExtraHeader($rootScope.token);
                var request = $scope.sjs.Request();

                // Construct Solr query
                var fq = '';
                if (filterSrv.getSolrFq()) {
                    fq = '&' + filterSrv.getSolrFq();
                }

                //fq = filterSrv.replaceSolrCollectionTimefieldByVendor($scope.panel.selectedSolrCollection, fq);

                //fq = '&fq=datacreated_dt:[NOW/DAY-1MONTH%20TO%20NOW/DAY]';

                var timeField = config['timefield'];
                var wt = '&wt=json';
                var fl = '&fl=' + $scope.panel.field;
                var rows_limit = '&facet.limit=' + $scope.panel.max_rows;
                var end_time = filterSrv.getEndTime();
                if (end_time === "*") {
                    end_time = "NOW"
                }
                
                
                
                var facet_gap = $scope.sjs.convertFacetGap($scope.panel.interval);
                //$scope.l = querySrv.getQuery(0) + fq + fl + wt + rows_limit;

                //$scope.panel.queries.query = $scope.get_query($scope.panel.selectedSolrCollection, $scope.panel.selectedChartType);



                $scope.panel.queries.query = querySrv.getQuery(0) + fq + wt + rows_limit
                    + '&facet=true&indent=on&rows=0&facet.pivot={!range=r1}' + $scope.panel.field
                    + '&facet.range={!tag=r1}' + timeField //filterSrv.getTimeField() //datacreated_dt'
                    + '&facet.range.start=' + filterSrv.getStartTime()
                    + '&facet.range.end=' + end_time
                    + '&facet.range.gap=' + facet_gap;
                //+ '&facet.range.gap=%2B24HOUR';
                //+ '&facet.range.start=NOW/DAY-1MONTH'
                //+ '&facet.range.end=NOW/DAY'
                //+ '&facet.range.gap=%2B24HOUR';

                //$scope.panel.queries.query = querySrv.getQuery(0) + "&indent=on&rows=0&facet=true&facet.pivot={!range=r1}url_s&facet.range={!tag=r1}datacreated_dt&facet.range.start=NOW/DAY-1MONTH&facet.range.end=NOW/DAY&facet.range.gap=%2B24HOUR&facet.limit=10&fq=datacreated_dt:[NOW/DAY-1MONTH%20TO%20NOW/DAY]&wt=json";
                //console.log("sjs server:"+JSON.stringify($scope.sjs.client.server()));
                //console.log("call multiline -------------------------------------"+$scope.panel.queries.query);
                // Set the additional custom query
                if ($scope.panel.queries.custom != null) {
                    request = request.setQuery($scope.panel.queries.query + $scope.panel.queries.custom);
                } else {
                    request = request.setQuery($scope.panel.queries.query);
                }
                //alert(dashboard.current.solr.server + dashboard.current.solr.core_name);
                //alert('------'+$scope.panel.queries.query);
                var fromDate = null;
                var toDate = null;
                var time_mode = "absolute";
                if (filterSrv.list[0].from.indexOf("NOW") >= 0) {
                    time_mode = "relative"
                }
                ;
                if (filterSrv.list[0].to.indexOf("*") >= 0) {
                    time_mode = "since"
                }
                ;
                //console.log("time moe:"+ time_mode);
                if ((time_mode.indexOf("relative") >= 0) || (time_mode.indexOf("since") >= 0)) {

                    //console.log("relative and since");
                    fromDate = filterSrv.list[0].fromDateObj.getFullYear() + "/" + (parseInt(filterSrv.list[0].fromDateObj.getMonth()) + 1) + "/" + filterSrv.list[0].fromDateObj.getDate();
                    toDate = filterSrv.list[0].toDateObj.getFullYear() + "/" + (parseInt(filterSrv.list[0].toDateObj.getMonth()) + 1) + "/" + filterSrv.list[0].toDateObj.getDate();
                    console.log("---" + JSON.stringify(toDate));
                } else {

                    //console.log("abs:" + JSON.stringify(filterSrv.list[0]));
                    var tempFrom = new Date(filterSrv.list[0].from);
                    var tempTo = new Date(filterSrv.list[0].to);
                    fromDate = tempFrom.getFullYear() + "/" + (parseInt(tempFrom.getMonth()) + 1) + "/" + tempFrom.getDate();
                    toDate = tempTo.getFullYear() + "/" + (parseInt(tempTo.getMonth()) + 1) + "/" + tempTo.getDate();
                    console.log("---" + JSON.stringify(toDate));
                }
                ;
                //var fromDate = filterSrv.list[0].fromDateObj.getFullYear() + "/" + (parseInt(filterSrv.list[0].fromDateObj.getMonth())+1) + "/" + filterSrv.list[0].fromDateObj.getDate();
                //var toDate = filterSrv.list[0].toDateObj.getFullYear() + "/" + (parseInt(filterSrv.list[0].toDateObj.getMonth())+1) + "/" + filterSrv.list[0].toDateObj.getDate();

                var eventResults = $http({
                    url: config.sitehttp + config.siteURL + config.getEventURL + '?startDate=' + fromDate + '&endDate=' + toDate,
                    headers: {'Authorization': 'Bearer ' + $rootScope.token},
                    method: 'GET',
                });
                eventResults.then(
                    function (results) {
                        //console.log("-----------------------------"+JSON.stringify(results.data));
                        $scope.markers = results.data;
                    },
                    function (error) {
                        console.log("error on get event!");
                    }
                );


                // Execute the search and get results
                var results = request.doSearch();

                // Populate scope when we have results
                results.then(function (results) {
                    $scope.data = {};
                    // Hide the spinning wheel icon
                    $scope.panelMeta.loading = false;

                    //var parsedResults = d3.csv.parse(results, function(d) {
                    //  d[$scope.panel.field] = +d[$scope.panel.field]; // coerce to number
                    //  return d;
                    //});
                    //$scope.data = _.pluck(parsedResults,$scope.panel.field);
                    //$scope.data = results.facet_counts.facet_fields._text_;
                    //$scope.data = $scope.data.facet_counts.facet_pivot.url_s;
                    //console.log(JSON.stringify(results));
                    var tsvArray = [];
                    var data = [];
                    try {
                        dataSize = results.facet_counts.facet_pivot[$scope.panel.field].length;
                        data = results.facet_counts.facet_pivot[$scope.panel.field];
                    } catch (err) {
                        dataSize = 0;
                        data = [];
                    }
                    ;
                    if (data.length <= 0) $scope.panel.error = 'No data returned.';
                    // convert solr data to tsv correct format , in order to run this program
                    for (var key in data) {
                        var pivotData = data[key].ranges[timeField].counts;
                        //for (var key2 = 0 ; key2 < data[key].ranges.visit_time_dt.counts.length ; key2 += 2 ){
                        for (var key2 = 0; key2 < pivotData.length; key2 += 2) {
                            //var ratingValue = data[key].ranges.visit_time_dt.counts[key2+1];
                            var ratingValue = pivotData[key2 + 1];
                        
                            // Calculate estimate page view for wsi data
                            // - page view is calculated using the config.wsi_page_view_ratio 
                            if ($scope.panel.selectedSolrCollection === 'wsi_collection' && $scope.panel.selectedDataType === 'Page view') {
                                ratingValue = Math.round(ratingValue * config.wsi_page_view_ratio);
                            }
                     
                            
                            //if (ratingValue == 0 ) ratingValue = null;
                            var columnName = data[key].value;
                            if (key == 0) {
                                var attributeName = columnName; //for IE syntax, for dynamic attribute name
                                var ObjectA = {};
                                ObjectA["date"] = pivotData[key2];
                                ObjectA[attributeName] = ratingValue.toString();
                                tsvArray.push(ObjectA);
                            } else {
                                tsvArray[key2 / 2][columnName] = ratingValue.toString();
                            }
                        }
                    }
                    ;
                    //console.log("1111111:"+JSON.stringify(tsvArray));
                    $scope.data = tsvArray;

                    $scope.data.forEach(function (d) { // Make every date in the csv data a javascript date object format
                        //console.log(d.date);
                        d.date = parseDate(d.date);
                    });
                    /*
                     $scope.markers = [
                     {
                     "date": "2017-01-01",
                     "type": "client",
                     "version": "2.0"
                     },

                     ];
                     */
                    //console.log("hhhhh "+JSON.stringify($scope.markers));
                    $scope.render();
                });
            };
        });

        module.directive('eventmultilineChart', function (querySrv, dashboard, filterSrv) {
            return {
                restrict: 'E',
                link: function (scope, element) {
                    var parent_width = element.parent().width();
                    var links = null;
                    var word1 = "";
                    var word2 = "";
                    var circle_min = 5, circle_max = 75;
                    var data_min = 0, data_max = 0;
                    var width = 960, height = 500;
                    //var width = 760, height = 500;
                    var force = null;
                    var svg = null;
                    var circle = null;
                    var text = null;
                    scope.$on('render', function () {


                        render_panel();
                    });

                    // Render the panel when resizing browser window
                    angular.element(window).bind('resize', function () {
                        render_panel();
                    });

                    // Function for rendering panel
                    function render_panel() {
                        // Clear the panel
                        //console.log("-start start start -----------------------------------------------------------");
                        element.html('');
                        function time_format(interval) {
                            var _int = kbn.interval_to_seconds(interval);
                            //if(_int >= 2628000) {
                            //  return "%m/%y";
                            // }
                            if (_int >= 604800) {
                                return "%m/%d/%y";
                            }
                            if (_int >= 3600) {
                                //TODO fix "%H:%M %m/%d"
                                return "%m/%d";
                            }
                            return "%H:%M";
                        };

                        var tip = d3tip()
                            .attr('class', 'd3-tip')
                            .offset([-10, 0])
                            .html(function (d) {
                                return "<strong>" + d.date.substring(0, 10) + " " + d.eventName + "</strong>";
                            });


                        var margin = {top: 20, right: 200, bottom: 100, left: 50},
                            margin2 = {top: 430, right: 10, bottom: 20, left: 40},
                            width = 960 - margin.left - margin.right,
                            height = 500 - margin.top - margin.bottom,
                            height2 = 500 - margin2.top - margin2.bottom;

                        width = element.parent().width() - margin.left - margin.right - 100;  // this width control the inner chart width

                        //var parseDate = d3.time.format("%Y%m%d").parse;
                        var bisectDate = d3.bisector(function (d) {
                            return d.date;
                        }).left;

                        var xScale = d3.time.scale()
                                .range([0, width]),

                            xScale2 = d3.time.scale()
                                .range([0, width]); // Duplicate xScale for brushing ref later

                        var yScale = d3.scale.linear()
                            .range([height, 0]);

                        var colorArray = ["#48A36D", "#56AE7C", "#64B98C", "#72C39B", "#80CEAA",
                            "#80CCB3", "#7FC9BD", "#7FC7C6", "#7EC4CF", "#7FBBCF",
                            "#7FB1CF", "#80A8CE", "#809ECE", "#8897CE", "#8F90CD",
                            "#9788CD", "#9E81CC", "#AA81C5", "#B681BE", "#C280B7",
                            "#CE80B0", "#D3779F", "#D76D8F", "#DC647E", "#E05A6D",
                            "#E16167", "#E26962", "#E2705C", "#E37756", "#E38457",
                            "#E39158", "#E29D58", "#E2AA59", "#E0B15B", "#DFB95C",
                            "#DDC05E", "#DBC75F", "#E3CF6D", "#EAD67C", "#F2DE8A"];


                        // 40 Custom DDV colors
                        //var color = d3.scale.ordinal().range(["#48A36D",  "#56AE7C",  "#64B98C", "#72C39B", "#80CEAA", "#80CCB3", "#7FC9BD", "#7FC7C6", "#7EC4CF", "#7FBBCF", "#7FB1CF", "#80A8CE", "#809ECE", "#8897CE", "#8F90CD", "#9788CD", "#9E81CC", "#AA81C5", "#B681BE", "#C280B7", "#CE80B0", "#D3779F", "#D76D8F", "#DC647E", "#E05A6D", "#E16167", "#E26962", "#E2705C", "#E37756", "#E38457", "#E39158", "#E29D58", "#E2AA59", "#E0B15B", "#DFB95C", "#DDC05E", "#DBC75F", "#E3CF6D", "#EAD67C", "#F2DE8A"]);

                        // re-arrage color scale by real data array size
                        //var jsonArraySize = scope.data.length;
                        //console.log('json array size:'+jsonArraySize);
                        var numberDivided = 40 / dataSize;
                        numberDivided = parseInt(numberDivided);
                        var newColorArray = [];
                        for (var index = 0; index < colorArray.length; index += numberDivided) {
                            newColorArray.push(colorArray[index]);
                        }
                        ;
                        var color = d3.scale.ordinal().range(newColorArray);

                        var xAxis = d3.svg.axis()
                                .scale(xScale)
                                .orient("bottom")
                                .tickFormat(d3.time.format(time_format(scope.panel.interval))),

                            xAxis2 = d3.svg.axis() // xAxis for brush slider
                                .scale(xScale2)
                                .orient("bottom")
                                .tickFormat(d3.time.format(time_format(scope.panel.interval)));

                        var yAxis = d3.svg.axis()
                            .scale(yScale)
                            .orient("left")
                            .tickFormat(function (d) {
                                var d_string = d;
                                if (d >= 1000 && d < 1000000) d_string = (d / 1000) + "k";
                                if (d >= 1000000 && d < 1000000000) d_string = (d / 1000000 ) + "M";
                                if (d >= 1000000000) d_string = (d / 1000000000 ) + "B";
                                return d_string
                            });

                        var line = d3.svg.line()
                            .interpolate("linear")
                            .x(function (d) {
                                return xScale(d.date);
                            })
                            .y(function (d) {
                                return yScale(d.rating);
                            });
                        //.defined(function(d) { return d.rating; });  // Hiding line value defaults of 0 for missing data


                        var maxY; // Defined later to update yAxis

                        var svg = d3.select(element[0]).append("svg")
                        //.attr("background","#FFFFFF")
                            .attr("width", width + margin.left + margin.right + 100)  // this width controls svg's width
                            .attr("height", height + margin.top + margin.bottom + 50) //height + margin.top + margin.bottom
                            .append("g")
                            .attr("transform", "translate(" + 100 + "," + (margin.top + 20) + ")");
                        //.attr("transform", "translate(" + margin.left + "," + margin.top + ")");
                        /*
                         svg.append("text")
                         .attr("x",0 - 70)
                         .attr("y",0 - 30 )
                         .style("fill",config.themeTextFillColor)
                         .style("font-size","12px")
                         .style("font-family","'Open Sans', 'Helvetica Neue', Helvetica, Arial, sans-serif !important")
                         //.attr("fill","#000")
                         .text("Data source: " + eval('config.' + scope.panel.selectedSolrCollection ));
                         */
                        // Create invisible rect for mouse tracking
                        svg.append("rect")
                            .attr("width", width)
                            .attr("height", height)
                            .attr("x", 0)
                            .attr("y", 0)
                            .attr("id", "mouse-tracker2")
                            .style("fill", "white");

                        //for slider part-----------------------------------------------------------------------------------

                        svg.call(tip);

                        var context = svg.append("g") // Brushing context box container
                            .attr("transform", "translate(" + 0 + "," + 410 + ")")
                            .attr("class", "context");

                        //append clip path for lines plotted, hiding those part out of bounds
                        svg.append("defs")
                            .append("clipPath")
                            .attr("id", "clip")
                            .append("rect")
                            .attr("width", width)
                            .attr("height", height);

                        //end slider part-----------------------------------------------------------------------------------

                        //d3.tsv("data.tsv", function(error, data) {
                        //console.log(JSON.stringify(data));
                        var data = scope.data;
                        //console.log(JSON.stringify(data));
                        color.domain(d3.keys(data[0]).filter(function (key) { // Set the domain of the color ordinal scale to be all the csv headers except "date", matching a color to an issue
                            return key !== "date";
                        }));

                        //data.forEach(function(d) { // Make every date in the csv data a javascript date object format
                        //  console.log(d.date);
                        //  if (d.date.length() == 8) d.date = parseDate(d.date);
                        //});
                        //alert(JSON.stringify(data));
                        var categories = color.domain().map(function (name) { // Nest the data into an array of objects with new keys

                            return {
                                name: name, // "name": the csv headers except date
                                values: data.map(function (d) { // "values": which has an array of the dates and ratings
                                    return {
                                        date: d.date,
                                        rating: +(d[name]),
                                    };
                                }),
                                //visible: (name === "Unemployment" ? true : false) // "visible": all false except for economy which is true.
                                visible: true
                            };
                        });

                        xScale.domain(d3.extent(data, function (d) {
                            return d.date;
                        })); // extent = highest and lowest points, domain is data, range is bouding box

                        yScale.domain([0, //100
                            d3.max(categories, function (c) {
                                return d3.max(c.values, function (v) {
                                    return v.rating;
                                });
                            })
                        ]);

                        xScale2.domain(xScale.domain()); // Setting a duplicate xdomain for brushing reference later

                        //for slider part-----------------------------------------------------------------------------------

                        var brush = d3.svg.brush()//for slider bar at the bottom
                            .x(xScale2)
                            .on("brush", brushed);


                        context.append("g") // Create brushing xAxis
                            .attr("class", "x axis1")
                            .attr("transform", "translate(0," + height2 + ")")
                            .style("font-size", "10px")
                            .call(xAxis2)
                            .append("text")
                            .attr("y", 40)
                            .attr("x", width / 2)
                            .text("Date");


                        var contextArea = d3.svg.area() // Set attributes for area chart in brushing context graph
                            .interpolate("linear")
                            .x(function (d) {
                                return xScale2(d.date);
                            }) // x is scaled to xScale2
                            .y0(height2) // Bottom line begins at height2 (area chart not inverted)
                            .y1(0); // Top line of area, 0 (area chart not inverted)

                        //plot the rect as the bar at the bottom
                        context.append("path") // Path is created using svg.area details
                            .attr("class", "area")
                            .attr("d", contextArea(categories[0].values)) // pass first categories data .values to area path generator
                            .attr("fill", "#e9e9e7");
                        //.attr("fill", "#F1F1F2");

                        //append the brush for the selection of subsection
                        context.append("g")
                            .attr("class", "x brush")
                            .call(brush)
                            .selectAll("rect")
                            .attr("height", height2) // Make brush rects same height
                            .attr("fill", "#E6E7E8");
                        //end slider part-----------------------------------------------------------------------------------

                        // draw line graph
                        svg.append("g")
                            .attr("class", "x axis")
                            .attr("transform", "translate(0," + height + ")")
                            .style("font-size", "10px")
                            .call(xAxis);

                        svg.append("g")
                            .attr("class", "y axis")
                            .style("font-size", "12px")
                            .call(yAxis)
                            .append("text")
                            .attr("transform", "rotate(-90)")
                            //.attr("y", 6)
                            //.attr("x", -10)
                            .attr("y", -70)
                            .attr("x", -height / 2)
                            .attr("dy", ".71em")
                            //.style("text-anchor", "end")
                            .style("text-anchor", "middle")
                            .text(scope.panel.selectedDataType);

                        svg.selectAll("path.domain").style("display", "none");

                        var issue = svg.selectAll(".issue")
                            .data(categories) // Select nested data and append to new svg group elements
                            .enter().append("g")
                            .attr("class", "issue");

                        issue.append("path")
                            .attr("class", "line")
                            .style("fill", "none")
                            .style("stroke-width", "1.5px")
                            .style("pointer-events", "none") // Stop line interferring with cursor
                            .attr("id", function (d) {
                                //return "line-" + d.name.replace(" ", "").replace("/", ""); // Give line id of line-(insert issue name, with any spaces replaced with no spaces)
                                return "line-" + removeNoneValidChars(d.name);
                            })
                            .attr("d", function (d) {
                                return d.visible ? line(d.values) : null; // If array key "visible" = true then draw line, if not then don't
                            })
                            .attr("clip-path", "url(#clip)")//use clip path to make irrelevant part invisible
                            .style("stroke", function (d) {
                                return color(d.name);
                            });

                        // draw legend
                        var legendSpace = 450 / categories.length; // 450/number of issues (ex. 40)

                        issue.append("rect")
                            .attr("width", 10)
                            .attr("height", 10)
                            .attr("x", width + (margin.right / 3) - 15)
                            .attr("y", function (d, i) {
                                return (legendSpace) + i * (legendSpace) - 8;
                            })  // spacing
                            .attr("fill", function (d) {
                                //return d.visible ? color(d.name) : "#F1F1F2"; // If array key "visible" = true then color rect, if not then make it grey
                                return d.visible ? color(d.name) : "#e4e4e7"; // If array key "visible" = true then color rect, if not then make it grey
                            })
                            .attr("class", "legend-box")

                            .on("click", function (d) { // On click make d.visible
                                d.visible = !d.visible; // If array key for this data selection is "visible" = true then make it false, if false then make it true

                                maxY = findMaxY(categories); // Find max Y rating value categories data with "visible"; true
                                yScale.domain([0, maxY]); // Redefine yAxis domain based on highest y value of categories data with "visible"; true
                                svg.select(".y.axis")
                                    .transition()
                                    .call(yAxis);

                                issue.select("path")
                                    .transition()
                                    .attr("d", function (d) {
                                        return d.visible ? line(d.values) : null; // If d.visible is true then draw line for this d selection
                                    })

                                issue.select("rect")
                                    .transition()
                                    .attr("fill", function (d) {
                                        //return d.visible ? color(d.name) : "#F1F1F2";
                                        return d.visible ? color(d.name) : "#e4e4e7";
                                    });
                            })

                            .on("mouseover", function (d) {

                                d3.select(this)
                                    .transition()
                                    .attr("fill", function (d) {
                                        return color(d.name);
                                    });

                                //d3.select("#line-" + d.name.replace(" ", "").replace("/", ""))
                                d3.select("#line-" + removeNoneValidChars(d.name))
                                    .transition()
                                    .style("stroke-width", 3.5);
                            })

                            .on("mouseout", function (d) {

                                d3.select(this)
                                    .transition()
                                    .attr("fill", function (d) {
                                        //return d.visible ? color(d.name) : "#F1F1F2";});
                                        return d.visible ? color(d.name) : "#e4e4e7";
                                    });

                                //d3.select("#line-" + d.name.replace(" ", "").replace("/", ""))
                                d3.select("#line-" + removeNoneValidChars(d.name))
                                    .transition()
                                    .style("stroke-width", 1.5);
                            })

                        issue.append("text")
                            .attr("x", width + (margin.right / 3))
                            .attr("y", function (d, i) {
                                return (legendSpace) + i * (legendSpace);
                            })  // (return (11.25/2 =) 5.625) + i * (5.625)
                            .text(function (d) {
                                return d.name;
                            });

                        // Hover line
                        var hoverLineGroup = svg.append("g")
                            .attr("class", "hover-line");

                        var hoverLine = hoverLineGroup // Create line with basic attributes
                            .append("line")
                            .attr("id", "hover-line")
                            .attr("x1", 10).attr("x2", 10)
                            .attr("y1", 0).attr("y2", height + 10)
                            .style("pointer-events", "none") // Stop line interferring with cursor
                            .style("opacity", 1e-6); // Set opacity to zero

                        var hoverDate = hoverLineGroup
                            .append('text')
                            .attr("class", "hover-text")
                            .attr("y", height - (height - 40)) // hover date text position
                            .attr("x", width - 150) // hover date text position
                            .style("fill", "#E6E7E8");

                        var columnNames = d3.keys(data[0]) //grab the key values from your first data row
                        //these are the same as your column names
                            .slice(1); //remove the first column name (`date`);

                        var focus = issue.select("g") // create group elements to house tooltip text
                            .data(columnNames) // bind each column name date to each g element
                            .enter().append("g") //create one <g> for each columnName
                            .attr("class", "focus");

                        focus.append("text") // http://stackoverflow.com/questions/22064083/d3-js-multi-series-chart-with-y-value-tracking
                            .attr("class", "tooltip")
                            .style("font-size", "11px")
                            .style("opacity", "0.5")
                            .attr("x", width + 20) // position tooltips
                            .attr("y", function (d, i) {
                                return (legendSpace) + i * (legendSpace);
                            }); // (return (11.25/2 =) 5.625) + i * (5.625) // position tooltips

                        // Add mouseover events for hover line.
                        d3.select("#mouse-tracker2") // select chart plot background rect #mouse-tracker
                            .on("mousemove", mousemove) // on mousemove activate mousemove function defined below
                            .on("mouseout", function () {
                                hoverDate
                                    .text(null) // on mouseout remove text for hover date

                                d3.select("#hover-line")
                                    .style("opacity", 1e-6); // On mouse out making line invisible
                            });
                        var parseDate = d3.time.format('%Y-%m-%d').parse;
                        var markerss = scope.markers.map(function (marker) {
                            return {
                                eventName: marker.eventName,
                                date: marker.eventDate,
                                type: marker.eventType,
                                recurrent: marker.recurrent,
                                version: 0 //marker.version
                            };
                        });
                        markerss.forEach(function (marker, i) {
                            //setTimeout(function () {
                            drawMarker(marker, svg, height, xScale);
                            //}, 1000 + 500*i);
                        });
                        //addMaker(markerss,svg,150, xScale);
                        //----------------------------------------------------------------
                        function drawMarker(markersss, svg, chartHeight, x) {

                            //console.log("inside add marker" + JSON.stringify(markersss));

                            var parseDate = d3.time.format('%Y-%m-%d').parse;
                            var converteddate = parseDate(markersss.date.substring(0, 10));
                            //console.log("paresed date:"+marker.date);

                            var radius = 5,
                            //xPos = x(converteddate) - radius - 3,
                            //yPosStart = chartHeight - radius - 3 ,
                            //yPosEnd = (String(markersss.type) === 'client' ? 80 : 160) + radius - 3;
                                xPos = x(converteddate),
                                yPosStart = chartHeight,
                                yPosEnd = 80;
                            if (xPos <= 0) {
                                return;
                            }
                            ;
                            var markerG = svg.append('g')
                                .attr('id', 'eventLollipop')
                                .attr('class', 'marker client')   //+String(markersss.type).toLowerCase())
                                .attr('transform', 'translate(' + xPos + ', ' + yPosStart + ')')
                                .style("fill", "rgba(255, 127, 0, 0.8)")
                                .style("stroke", "rgba(255, 127, 0, 0.8)")
                                .style("stroke-width", "0.5")
                                .attr('opacity', 0);

                            markerG.transition()
                                .duration(1000)
                                .attr('transform', 'translate(' + xPos + ', ' + yPosEnd + ')')
                                .attr('opacity', 1);

                            markerG.append('path')
                                .attr('d', 'M' + radius + ',' + (chartHeight - yPosStart) + 'L' + radius + ',' + (chartHeight - yPosStart))
                                .style("fill", "rgba(255, 127, 0, 0.8)")
                                .style("stroke", "rgba(255, 127, 0, 0.8)")
                                .style("stroke-width", "0.5")
                                .transition()
                                .duration(1000)
                                .attr('d', 'M' + radius + ',' + (chartHeight - yPosEnd) + 'L' + radius + ',' + (radius * 2));

                            var insideObject = [];
                            insideObject.push(markersss);
                            markerG.append('circle')
                                .data(insideObject)
                                .attr('class', 'marker-bg')
                                .attr('cx', radius)
                                .attr('cy', radius)
                                .attr('r', radius)
                                .on('mouseover', tip.show)
                                .on('mouseout', tip.hide);

                            /*
                             markerG.append('text')
                             .attr('x', radius)
                             .attr('y', radius*0.9)
                             .text(markersss.type);

                             markerG.append('text')
                             .attr('x', radius)
                             .attr('y', radius*1.5)
                             .text(markersss.version);
                             */
                        };

                        //-----------------------------------------
                        function mousemove() {


                            var mouse_x = d3.mouse(this)[0]; // Finding mouse x position on rect
                            var graph_x = xScale.invert(mouse_x); //

                            //var mouse_y = d3.mouse(this)[1]; // Finding mouse y position on rect
                            //var graph_y = yScale.invert(mouse_y);


                            var format = d3.time.format('%b %Y'); // Format hover date text to show three letter month and full year

                            hoverDate.text(format(graph_x)); // scale mouse position to xScale date and format it to show month and year

                            d3.select("#hover-line") // select hover-line and changing attributes to mouse position
                                .attr("x1", mouse_x)
                                .attr("x2", mouse_x)
                                .style("opacity", 1); // Making line visible

                            // Legend tooltips // http://www.d3noob.org/2014/07/my-favourite-tooltip-method-for-line.html

                            var x0 = xScale.invert(d3.mouse(this)[0]), /* d3.mouse(this)[0] returns the x position on the screen of the mouse. xScale.invert function is reversing the process that we use to map the domain (date) to range (position on screen). So it takes the position on the screen and converts it into an equivalent date! */
                                i = bisectDate(data, x0, 1), // use our bisectDate function that we declared earlier to find the index of our data array that is close to the mouse cursor
                            /*It takes our data array and the date corresponding to the position of or mouse cursor and returns the index number of the data array which has a date that is higher than the cursor position.*/
                                d0 = data[i - 1],
                                d1 = data[i],
                            /*d0 is the combination of date and rating that is in the data array at the index to the left of the cursor and d1 is the combination of date and close that is in the data array at the index to the right of the cursor. In other words we now have two variables that know the value and date above and below the date that corresponds to the position of the cursor.*/
                                d = x0 - d0.date > d1.date - x0 ? d1 : d0;
                            /*The final line in this segment declares a new array d that is represents the date and close combination that is closest to the cursor. It is using the magic JavaScript short hand for an if statement that is essentially saying if the distance between the mouse cursor and the date and close combination on the left is greater than the distance between the mouse cursor and the date and close combination on the right then d is an array of the date and close on the right of the cursor (d1). Otherwise d is an array of the date and close on the left of the cursor (d0).*/

                            //d is now the data row for the date closest to the mouse position

                            focus.select("text").text(function (columnName) {
                                //because you didn't explictly set any data on the <text>
                                //elements, each one inherits the data from the focus <g>

                                return (d[columnName]);
                            });
                        };

                        //for brusher of the slider bar at the bottom
                        function brushed() {

                            xScale.domain(brush.empty() ? xScale2.domain() : brush.extent()); // If brush is empty then reset the Xscale domain to default, if not then make it the brush extent

                            svg.select(".x.axis") // replot xAxis with transition when brush used
                                .transition()
                                .call(xAxis);

                            maxY = findMaxY(categories); // Find max Y rating value categories data with "visible"; true
                            yScale.domain([0, maxY]); // Redefine yAxis domain based on highest y value of categories data with "visible"; true

                            svg.select(".y.axis") // Redraw yAxis
                                .transition()
                                .call(yAxis);

                            issue.select("path") // Redraw lines based on brush xAxis scale and domain
                                .transition()
                                .attr("d", function (d) {
                                    return d.visible ? line(d.values) : null; // If d.visible is true then draw line for this d selection
                                });

                            svg.selectAll("#eventLollipop").remove();
                            //redraw event marker
                            markerss.forEach(function (marker, i) {
                                drawMarker(marker, svg, height, xScale);
                            });
                        };

                        //}); // End Data callback function

                        //d3.json("data.json", function(data) {
                        //  alert(JSON.stringify(data.facet_counts.facet_pivot.url_s[0].value));
                        //});
                        function findMaxY(data) {  // Define function "findMaxY"
                            var maxYValues = data.map(function (d) {
                                if (d.visible) {
                                    return d3.max(d.values, function (value) { // Return max rating value
                                        return value.rating;
                                    })
                                }
                            });
                            return d3.max(maxYValues);
                        };
                        function removeNoneValidChars(inputData) {
                            var newString = inputData.replace(" ", "").replace(/\//g, "")
                                .replace(/\?/g, "").replace(/\&/g, "")
                                .replace(/\=/g, "").replace(/\./g, "");
                            return newString;
                        };
                    }


                },
            };
        });

    });
