/*
 ## Bar module
 * For tutorial on how to create a custom Banana module.
 */
define([
        'angular',
        'app',
        'underscore',
        'jquery',
        'kbn',
        'd3',
        'moment',
        'config',
        './d3.tip'
    ],
    function (angular, app, _, $,kbn, d3, moment, config, d3tip) {
        'use strict';

        var module = angular.module('kibana.panels.correlation', []);
        app.useModule(module);
        var dataSize = 0;
        var parseDate = d3.time.format("%Y-%m-%dT%H:%M:%SZ").parse;
        var daysDiff = 1;
        module.controller('correlation', function ($http, $scope, dashboard, querySrv, filterSrv, $rootScope, $q) {

            $scope.panelMeta = {
                modals: [
                    {
                        description: 'Inspect',
                        icon: 'icon-info-sign',
                        partial: 'app/partials/inspector.html',
                        show: $scope.panel.spyable
                    }
                ],
                exportfiletocsv:true,
                status: '',
                description: 'Two line charts'
            };

            // Define panel's default properties and values
            var _d = {
                queries: {
                    mode: 'all',
                    query: '*:*',
                    custom: ''
                },
                field: '',
                max_rows: 1,
                spyable: true,
                show_queries: false,
                user_input_start_date: '',
                user_input_end_date: '',
                user_input_amount: 0,
                selectedDataType: "",
                selectedSolrCollection: "",
                //solrCollectionList:[],
                information_description: 'Tw0 line charts.',
                selectedDataSource: {name: ''},
                lineShape: '',
                dataSourceList: []
            };


            // Set panel's default values
            _.defaults($scope.panel, _d);
            if ($scope.panel.lineShape === '')  $scope.panel.lineShape = "linear";
            if (typeof $scope.panel.span === "undefined" || $scope.panel.span === '') $scope.panel.span = 12;
            $scope.panel.field = "start_time_dt";
            //if ($scope.panel.selectedDataType === "") $scope.panel.selectedDataType = "per visit";
            if ($scope.panel.selectedDataType === '') $scope.panel.selectedDataType = "per visit";

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
                console.log($scope.data);
                console.log($scope.data2);
                var emailRate = $scope.data;
                var otherData = $scope.data2;
                var response = "Date,Email Successful Rate\n";
                var response2 = "Date," + $scope.panel.selectedDataType + "\n";
                var basename = $scope.panel.title + "-" + $scope.panel.selectedDataSource.name + "-" + "Email Successful Rate\n";
                var basename2 = $scope.panel.title + "-" + $scope.panel.selectedDataSource.name + "-" + $scope.panel.selectedDataType + "\n";
                for (var item in emailRate) {
                    response += $scope.converttousdatetime(emailRate[item].date) + "," + emailRate[item].close + "\n";
                }
                for (var item2 in otherData) {
                    response2 += $scope.converttousdatetime(otherData[item2].date) + "," + otherData[item2].close + "\n";  

                }
                kbn.download_response_to_csv(response,basename);
                kbn.download_response_to_csv(response2,basename2);
                

            }

            $scope.init = function () {
                $scope.$on('refresh', function () { $scope.get_data(); });
                $scope.get_data();
            };

            $scope.set_refresh = function (state) { $scope.refresh = state; };

            $scope.close_edit = function () {
                if ($scope.refresh) { $scope.get_data(); }
                $scope.refresh = false;
                $scope.$emit('render');
            };

            $scope.render = function () { $scope.$emit('render'); };

            $scope.get_query = function (selectedCollection, selectedType, getEmailSuccessRate) {
                var end_time = filterSrv.getEndTime();
                if (end_time === "*")end_time = "NOW";

                var fq = querySrv.getQuery(0);

                if (getEmailSuccessRate) {
                    //fq = fq + config.wsi_email_success_rate_query;
                    
                    fq =  "q=*%3A*"  + config.wsi_email_success_rate_query;

                    fq = fq.replace("_facetgap_", '%2B48HOURS');

		 } else {
                    if (selectedCollection === "ultrareach_collection") {
                        if (selectedType === "Page hit") {
                            fq = fq + config.ultrareach_q_for_visit;
                        } else {
                            fq = fq + config.ultrareach_q_for_volume;
                        }
                    }

                    if (selectedCollection === "psiphon_collection") {
                        if (selectedType === "Page view") {
                            fq = fq + config.psiphon_q_for_visit;
                        } else {
                            fq = fq + config.psiphon_q_for_volume;
                        }
                    }

                    if (selectedType === 'Page hit' || selectedType === 'Page view') {
                        fq = fq + config.range_page_query;
                    } else {
                        fq = fq + config.range_traffic_query;
                    }

		    
                     fq = fq.replace("_facetgap_", '%2B24HOURS');

                }
                fq = fq.replace("_startdate_", filterSrv.getStartTime());
                fq = fq.replace("_enddate_", end_time);
              //  fq = fq.replace("_facetgap_", '%2B24HOURS');
                return fq;
            };

            $scope.get_data = function () {
                // Show the spinning wheel icon
                $scope.panelMeta.loading = true;
                $scope.panel.selectedSolrCollection = config[$scope.panel.selectedDataSource.name];
                $scope.panel.field = config['timefield'];

                // Set Solr server
                $scope.sjs.client.server(dashboard.current.solr.server + "wsi_collection");
                $scope.sjs.client.addExtraHeader($rootScope.token);
                var request = $scope.sjs.Request();

                // Construct Solr query
                var fq = '';

                $scope.panel.queries.query = $scope.get_query($scope.panel.selectedSolrCollection, $scope.panel.selectedDataType, 1);

                // Set the additional custom query
                if ($scope.panel.queries.custom != null) {
                    request = request.setQuery($scope.panel.queries.query + $scope.panel.queries.custom);
                } else {
                    request = request.setQuery($scope.panel.queries.query);
                }
                var results = {};
                var results2 = {};
                var mypromises = [];

                mypromises.push(request.doSearch());

                // prepare second api call
                $scope.sjs.client.server(dashboard.current.solr.server + $scope.panel.selectedSolrCollection);
                var request2 = $scope.sjs.Request();
                $scope.panel.queries.query = $scope.get_query($scope.panel.selectedSolrCollection, $scope.panel.selectedDataType, 0);
                request2 = request2.setQuery($scope.panel.queries.query);
                mypromises.push(request2.doSearch());

                $q.all(mypromises).then(function (allResults) {

                    // Execute the search and get results
                    // var results = request.doSearch();
                    results = allResults[0];
                    results2 = allResults[1];
                    // Populate scope when we have results
                    // results.then(function(results) {
                    $scope.panel.error = "";
                    $scope.data = {};
                    $scope.data2 = {};
                    // Hide the spinning wheel icon
                    $scope.panelMeta.loading = false;

                    var tsvArray = [];
                    var tsvArray2 = [];
                    var successRateData = results.facets.daily_success_rate.buckets;
                    var visitData = results2.facets.total.buckets;
                    // convert solr data to tsv correct format , in order to run this program
                    for (var key in successRateData) {
                        var tempDailySum = successRateData[key].success_rate;
                        if (typeof tempDailySum === "undefined") tempDailySum = 0;
                        tsvArray.push({"date": successRateData[key].val, "close": tempDailySum * 100});
                    }

                    for (var key in visitData) {
                        var tempDailySum = visitData[key].daily_sum;

                        // Short term fix for display estimated page view for WSI data
                        if (typeof tempDailySum === "undefined") {
                            tempDailySum = 0;
                        } else if ($scope.panel.selectedSolrCollection === "wsi_collection" && $scope.panel.selectedDataType === 'Page view') {
                            tempDailySum = Math.round(tempDailySum * config.wsi_page_view_ratio);
                        }
                        tsvArray2.push({"date": visitData[key].val, "close": tempDailySum});
                    }
                    $scope.data = tsvArray;
                    $scope.data2 = tsvArray2;
                    $scope.data.forEach(function (d) { // Make every date in the csv data a javascript date object format
                        d.date = parseDate(d.date);
                    });
                    $scope.data2.forEach(function (d) { // Make every date in the csv data a javascript date object format
                        d.date = parseDate(d.date);
                    });
                    $scope.render();
                });
            };
        });

        module.directive('correlationChart', function (querySrv, dashboard, filterSrv) {
            return {
                restrict: 'E',
                link: function (scope, element) {

                    scope.$on('render', function () {

                        render_panel();
                    });

                    // Render the panel when resizing browser window
                    angular.element(window).bind('resize', function () {
                        render_panel();
                    });

                    // Function for rendering panel
                    function render_panel() {
                        element.html('');

                        var tip = d3tip()
                            .attr('class', 'd3-tip')
                            .offset([-10, 0])
                            .html(function (d) {
                                return "<strong>" + d.date.substring(0, 10) + " " + d.eventName + "</strong>";
                            });

                        var parent_width = element.parent().width();
                        var margin = {top: 20, right: 50, bottom: 30, left: 50},
                            width = parent_width - margin.left - margin.right,
                            height = 500 - margin.top - margin.bottom;

                        var svg = d3.select(element[0]).append("svg")
                            .attr("width", parent_width) // - margin.left - margin.right  ) // this line controls svg's width
                            .attr("height", 500 + margin.top + margin.bottom) //height + margin.top + margin.bottom
                            .append("g")
                            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

                        var x = d3.time.scale()
                            .range([0, width]);

                        var y = d3.scale.linear()
                            .range([height, 0]);
                        var yVisit = d3.scale.linear()
                            .range([height, 0]);

                        var xAxis = d3.svg.axis()
                            .scale(x)
                            .orient("bottom")
                            .tickFormat(d3.time.format("%m/%d/%y %H:%M"));

                        var yAxis = d3.svg.axis()
                            .scale(y)
                            .orient("left")
                            .tickFormat(function (d) {
                                var d_string = d;
                                if (d >= 1000 && d < 1000000) d_string = (d / 1000) + "k";
                                if (d >= 1000000 && d < 1000000000) d_string = (d / 1000000 ) + "M";
                                if (d >= 1000000000) d_string = (d / 1000000000 ) + "B";
                                return d_string
                            });

                        var yVisitAxis = d3.svg.axis()
                            .scale(yVisit)
                            .orient("right")
                            .tickFormat(function (d) {
                                var d_string = d;
                                if (d >= 1000 && d < 1000000) d_string = (d / 1000) + "k";
                                if (d >= 1000000 && d < 1000000000) d_string = (d / 1000000 ) + "M";
                                if (d >= 1000000000) d_string = (d / 1000000000 ) + "B";
                                return d_string
                            });

                        var data2 = scope.data;
                        var visitData = scope.data2;
                        var parseDate2 = d3.time.format("%Y-%m%-d").parse;

                        x.domain(d3.extent(data2, function (d) {
                            return d.date;
                        }));

                        y.domain([0, 100]);
                        yVisit.domain([0, d3.max(visitData, function (d) { return d.close; })]);
                        var interpolateType = scope.panel.lineShape; //linear , monotone, cardinal

                        var line = d3.svg.line()
                            .x(function (d) { return x(d.date); })
                            .y(function (d) { return y(d.close); })
                            .interpolate(interpolateType); //optional, for smoother lines

                        var lineVisit = d3.svg.line()
                            .x(function (d) { return x(d.date); })
                            .y(function (d) { return yVisit(d.close); })
                            .interpolate(interpolateType); //optional, for smoother lines

                        // Chart x-axis data labels
                        /*svg.append("g")
                            .attr("transform", "translate(0," + height + ")")
                            .call(xAxis)
                            .selectAll("text")
                            .style("text-anchor", "middel");*/

                        svg.append("svg:g")
                            .attr("class", "x axis")
                            .attr("transform", "translate(0," + height + ")")
                            .call(xAxis)
                            .selectAll('.x .tick text') // select all the x tick texts
                            .call(function(t) {
                                t.each(function(d) { // for each one
                                    var self = d3.select(this);
                                    var s = self.text().split(' '); // get the text and split it
                                    self.text(''); // clear it out
                                    self.append("tspan") // insert two tspan
                                        .attr("x", 0)
                                        .attr("dy",".8em")
                                        .text(s[0]);
                                    self.append("tspan")
                                        .attr("x", 0)
                                        .attr("dy", "1em")
                                        .text(s[1]);
                                })
                            });

                        // Chart x-axis title
                        svg.append("g")
                            .append("text")
                            .attr("x", width / 2)
                            .attr("y", height + 50)
                            .text("Date");

                        svg.call(tip);

                        // Chart Left-sided y-axis title
                        svg.append("g")
                            .attr("class", "yaxis-left")
                            .call(yAxis)
                            .style("stroke", "#900c3f")
                            .append("text")
                            .attr("y", 6)
                            .attr("x", 5)
                            .attr("dy", "0.71em")
                            .attr("text-anchor", "head")
                            .text("email success rate %");

                        // Chart Right-sided y-axis title
                        svg.append("g")
                            .attr("class", "yaxis-right")
                            .call(yVisitAxis)
                            .attr("transform", "translate(" + width + ",0)")
                            .append("text")
                            .attr("y", 6)
                            .attr("x", -5)
                            .attr("dy", "0.71em")
                            .attr("text-anchor", "end")
                            .text(function () {
                                if (scope.panel.selectedDataType === "Traffic volume") {
                                    return "Data volume (Bytes)";
                                }
                                else {
                                    return scope.panel.selectedDataType;
                                }
                            });

                        svg.append("path")
                            .datum(data2)
                            .attr("fill", "none")
                            .attr("stroke", "#d56062")
                            .attr("stroke-width", 1)
                            .attr("d", line);

                        svg.append("path")
                            .datum(visitData)
                            .attr("fill", "none")
                            .attr("stroke", "#067bc2")
                            .attr("stroke-width", 1)
                            .attr("d", lineVisit);

                        svg.selectAll("path.domain")
                            .style("fill", "none")
                            .style("stroke", "#000");

                        svg.selectAll(".tick line")
                            .style("fill", "none")
                            .style("stroke", "#000");

                        svg.selectAll(".yaxis-left text")
                            .style("fill", "#d56062")
                            .style("stroke", "#d56062")
                            .style("font-size", "12px");

                        svg.selectAll(".yaxis-right text")
                            .style("fill", "#067bc2")
                            .style("stroke", "#067bc2")
                            .style("font-size", "12px");
                    }
                }
            };
        });
    });
