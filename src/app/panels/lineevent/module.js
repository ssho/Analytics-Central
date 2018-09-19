/*
 ## Bar module
 * For tutorial on how to create a custom Banana module.
 */
define([
        'angular',
        'app',
        'underscore',
        'jquery',
        'd3',
        'moment',
        'config',
        './d3.tip'
    ],
    function (angular, app, _, $, d3, moment, config, d3tip) {
        'use strict';

        var module = angular.module('kibana.panels.lineevent', []);
        app.useModule(module);
        var dataSize = 0;
        var parseDate = d3.time.format("%Y-%m-%dT%H:%M:%SZ").parse;
        var daysDiff = 1;
        module.controller('lineevent', function ($http, $scope, dashboard, querySrv, filterSrv, $rootScope) {


            $scope.panelMeta = {
                modals: [
                    {
                        description: 'Inspect',
                        icon: 'icon-info-sign',
                        partial: 'app/partials/inspector.html',
                        show: $scope.panel.spyable
                    }
                ],
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
                max_rows: 1,
                spyable: true,
                show_queries: false,
                user_input_start_date: '',
                user_input_end_date: '',
                user_input_amount: 0,
                selectedDataType: "",
                selectedSolrCollection: "",
                solrCollectionList: [],
                information_description: 'Line chart with events.',
                selectedDataSource: {name: ''},
                dataSourceList: [],
            };


            // Set panel's default values
            _.defaults($scope.panel, _d);
            if (typeof $scope.panel.span === 'undefined') $scope.panel.span = 12;
            $scope.panel.field = "start_time_dt";
            //if ($scope.panel.selectedChartType === "") $scope.panel.selectedDataType = "per visit";
            //$scope.panel.selectedDataType = "";

            $scope.panel.solrCollectionList = [];
            $scope.panel.dataSourceList = [];
            for (var item in $scope.userSolrCollection) {
                $scope.panel.dataSourceList.push(config[$scope.userSolrCollection[item].collectionName]);
            }
            ;
            if ($scope.panel.selectedDataSource.name === "") {
                for (var item in $scope.userSolrCollection) {
                    if ($scope.userSolrCollection[item].isDefault == 1) {
                        $scope.panel.selectedDataSource.name = config[$scope.userSolrCollection[item].collectionName];
                    }
                    ;
                }
                ;
            }
            ;
            //var parseDate = d3.time.format("%Y%m%d").parse;
            //var dataSize = 0;
            $scope.markers = {};
            $scope.init = function () {

                $scope.$on('refresh', function () {
                    $scope.get_data();
                });
                $scope.get_data();
            };

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

            $scope.get_query = function (selectedCollection, selectedType) {
                var end_time = filterSrv.getEndTime();
                if (end_time === "*") {
                    end_time = "NOW"
                }
                var fq = querySrv.getQuery(0);

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

                fq = fq.replace("_startdate_", filterSrv.getStartTime());
                fq = fq.replace("_enddate_", end_time);
                fq = fq.replace("_facetgap_", '%2B24HOURS');
                console.log('querystring:' + fq);
                return fq;     
            }

            $scope.get_data = function () {
                delete $scope.panel.error;
                $scope.panel.selectedSolrCollection = config[$scope.panel.selectedDataSource.name];
                // Show the spinning wheel icon
                $scope.panelMeta.loading = true;
                $scope.panel.field = config['timefield'];

                // Set Solr server
                $scope.sjs.client.server(dashboard.current.solr.server + $scope.panel.selectedSolrCollection);
                //$scope.sjs.client.server(dashboard.current.solr.server + "bbg_proxy_web_collection");
                $scope.sjs.client.addExtraHeader($rootScope.token);
                var request = $scope.sjs.Request();

                // Construct Solr query
                var fq = '';

                //$scope.panel.queries.query = querySrv.getQuery(0) + fq + fl + wt + rows_limit;
                $scope.panel.queries.query = $scope.get_query($scope.panel.selectedSolrCollection, $scope.panel.selectedDataType);


                // Set the additional custom query
                if ($scope.panel.queries.custom != null) {
                    request = request.setQuery($scope.panel.queries.query + $scope.panel.queries.custom);
                } else {
                    request = request.setQuery($scope.panel.queries.query);
                }


                // Execute the search and get results
                var results = request.doSearch();

                // Populate scope when we have results
                results.then(function (results) {
                    $scope.panel.error = "";
                    $scope.data = {};
                    // Hide the spinning wheel icon
                    $scope.panelMeta.loading = false;

                    var tsvArray = [];
                    var data = [];
                    try {
                        data = results.facets.total.buckets;
                    } catch (err) {
                        data = [];
                    }
                    ;
                    if (data.length <= 0) $scope.panel.error = 'No data returned.';
                    // convert solr data to tsv correct format , in order to run this program
                    for (var key in data) {
                        //var tempDate = data[key].val.substring(0,4) + data[key].val.substring(5,7) + data[key].val.substring(8,10);
                        //console.log("tempdate:"+tempDate);
                        var tempDailySum = data[key].daily_sum;
                        if (typeof tempDailySum === "undefined") {
                            tempDailySum = 0;
                        } else if ($scope.panel.selectedSolrCollection === 'wsi_collection' && $scope.panel.selectedDataType === 'Page view') {
                            tempDailySum = Math.round(tempDailySum * config.wsi_page_view_ratio);
                        } 
                        
                        //tsvArray.push({"date":tempDate, "close":tempDailySum});
                        tsvArray.push({"date": data[key].val, "close": tempDailySum});
                    }
                    ;

                    if ($scope.panel.selectedSolrCollection === "psiphon_collection") {
                    }
                    ;


                    $scope.data = tsvArray;
                    //console.log("doing for each data ");
                    $scope.data.forEach(function (d) { // Make every date in the csv data a javascript date object format
                        //console.log("---"+d.date);
                        d.date = parseDate(d.date);

                        //console.log("111---"+d.date);
                        //console.log("222---"+d.close);
                    });


//-----------------------------------
                    var fromDate = null;
                    var toDate = null;
                    //console.log("time moe:"+ dashboard.current.loader.user_selected_time_mode);
                    var time_mode = "absolute";
                    if (filterSrv.list[0].from.includes("NOW")) {
                        time_mode = "relative"
                    }
                    ;
                    if (filterSrv.list[0].to.includes("*")) {
                        time_mode = "since"
                    }
                    ;
                    //console.log("time moe:"+ time_mode);
                    if (time_mode.includes("relative") || time_mode.includes("since")) {

                        //console.log("relative and since");
                        fromDate = filterSrv.list[0].fromDateObj.getFullYear() + "/" + (parseInt(filterSrv.list[0].fromDateObj.getMonth()) + 1) + "/" + filterSrv.list[0].fromDateObj.getDate();
                        toDate = filterSrv.list[0].toDateObj.getFullYear() + "/" + (parseInt(filterSrv.list[0].toDateObj.getMonth()) + 1) + "/" + filterSrv.list[0].toDateObj.getDate();
                        //console.log("---"+JSON.stringify(toDate));
                    } else {

                        //console.log("abs:" + JSON.stringify(filterSrv.list[0]));
                        var tempFrom = new Date(filterSrv.list[0].from);
                        var tempTo = new Date(filterSrv.list[0].to);
                        fromDate = tempFrom.getFullYear() + "/" + (parseInt(tempFrom.getMonth()) + 1) + "/" + tempFrom.getDate();
                        toDate = tempTo.getFullYear() + "/" + (parseInt(tempTo.getMonth()) + 1) + "/" + tempTo.getDate();
                        //console.log("---"+JSON.stringify(toDate));
                    }
                    ;


                    var eventResults = $http({
                        url: config.sitehttp + config.siteURL + config.getEventURL + '?startDate=' + fromDate + '&endDate=' + toDate,
                        headers: {'Authorization': 'Bearer ' + $rootScope.token},
                        method: 'GET',
                    });
                    eventResults.then(
                        function (results) {
                            //console.log("-----------------------------"+JSON.stringify(results.data));
                            $scope.markers = results.data;
                            $scope.render();
                        },
                        function (error) {
                            console.log("error on get event!");
                            $scope.markers = [];
                            $scope.render();
                        }
                    );

//-----------------
                    //$scope.render();

                });


            };
        });

        module.directive('lineeventChart', function (querySrv, dashboard, filterSrv) {
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
                        // Clear the panel
                        //console.log("-start start start -----------------------------------------------------------");
                        element.html('');

                        var tip = d3tip()
                            .attr('class', 'd3-tip')
                            .offset([-10, 0])
                            .html(function (d) {
                                return "<strong>" + d.date.substring(0, 10) + " " + d.eventName + "</strong>";
                            });

                        var parent_width = element.parent().width();
                        var margin = {top: 20, right: 20, bottom: 30, left: 50},
                            width = parent_width - margin.left - margin.right,
                            height = 500 - margin.top - margin.bottom;

                        //var svg = d3.select("svg"),
                        //    margin = {top: 20, right: 20, bottom: 30, left: 50},
                        //    width = 960 - margin.left - margin.right,
                        //    height = 500 - margin.top - margin.bottom,
                        //    g = svg.append("g").attr("transform", "translate(" + margin.left + "," + margin.top + ")");

                        var svg = d3.select(element[0]).append("svg")
                            .attr("width", parent_width) // - margin.left - margin.right  ) // this line controls svg's width
                            .attr("height", 500 + margin.top + margin.bottom) //height + margin.top + margin.bottom
                            .append("g")
                            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

                        //var parseTime = d3.timeParse("%d-%b-%y");

                        //var x = d3.scaleTime()
                        var x = d3.time.scale()
                            .range([0, width]);

                        //var y = d3.scaleLinear()
                        var y = d3.scale.linear()
                            .range([height, 0]);


                        var xAxis = d3.svg.axis()
                            .scale(x)
                            .orient("bottom")
                            .tickFormat(d3.time.format("%m/%d/%y"));

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


                        var data2 = scope.data;
                        var parseDate2 = d3.time.format("%Y-%m%-d").parse;

                        //console.log("data2 "+JSON.stringify(scope.data));
                        x.domain(d3.extent(data2, function (d) {
                            return d.date;
                        }));
                        y.domain([0, d3.max(data2, function (d) {
                            return d.close;
                        })]);

                        var line = d3.svg.line()
                            .x(function (d) {
                                return x(d.date);
                            })
                            .y(function (d) {
                                return y(d.close);
                            })
                            .interpolate("linear"); //optional, for smoother lines


                        svg.append("g")
                            .attr("transform", "translate(0," + height + ")")
                            .call(xAxis)
                            .selectAll("text")
                            .attr("dx", "-.8em")
                            .attr("dy", ".15em")
                            .attr("transform", "rotate(-65)")
                            .style("text-anchor", "end");
                        //.call(d3.axisBottom(x));
                        svg.call(tip);

                        svg.append("g")
                        //.call(d3.axisLeft(y))
                            .call(yAxis)
                            .append("text")
                            .attr("fill", "#000")
                            .attr("transform", "rotate(-90)")
                            .attr("y", 6)
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
                        /*
                         svg.append("g")
                         .append("text")
                         .attr("class","message")
                         .attr("x",-margin.left)
                         .attr("y",-10)
                         .attr("fill",config.themeTextFillColor)
                         .text("Data source: " + eval('config.' + scope.panel.selectedSolrCollection ));
                         */
                        svg.append("path")
                            .datum(data2)
                            .attr("fill", "none")
                            .attr("stroke", "#067bc2")
                            .attr("stroke-width", 1.5)
                            .attr('opacity', 0.7)
                            .attr("d", line);


                        //var parseDate  = d3.time.format('%Y-%m-%d').parse;
                        scope.panel.error = "";
                        if (scope.markers.length <= 0) {
                            scope.panel.error = "No event found within this timpicker date range.";
                        } else {
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
                                drawMarker(marker, svg, height, x);
                                //}, 1000 + 500*i);
                            });
                        }
                        ;

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
                            ; // avoid to draw negative X value
                            var markerG = svg.append('g')
                                .attr('id', 'eventLollipop')
                                .attr('class', 'marker client')   //+String(markersss.type).toLowerCase())
                                .attr('transform', 'translate(' + xPos + ', ' + yPosStart + ')')
                                .attr('opacity', 0);

                            markerG.transition()
                                .duration(1000)
                                .attr('transform', 'translate(' + xPos + ', ' + yPosEnd + ')')
                                .attr('opacity', 1);

                            markerG.append('path')
                                .attr('d', 'M' + radius + ',' + (chartHeight - yPosStart) + 'L' + radius + ',' + (chartHeight - yPosStart))
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

                        };
                    }

                },
            };
        });

    });
