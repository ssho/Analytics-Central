/*

 ## Bar module
 * For tutorial on how to create a custom Banana module.
 */
define([
        'angular',
        'app',
        'underscore',
        'kbn',
        'jquery',
        'd3',
        'moment',
        'config'
    ],
    function (angular, app, _,kbn,  $, d3, moment, config) {
        'use strict';

        var module = angular.module('kibana.panels.costperformance', []);
        app.useModule(module);
        var dataSize = 0;
        var parseDate = d3.time.format("%Y-%m-%dT%H:%M:%SZ").parse;
        var daysDiff = 1;
        module.controller('costperformance', function ($scope, dashboard, querySrv, filterSrv, $rootScope) {

            $scope.panelMeta = {
                modals: [
                    {
                        description: 'Information',
                        icon: 'icon-info-sign',
                        partial: 'app/partials/inspector.html',
                        show: $scope.panel.spyable
                    }
                ],
                exportfiletocsv:true,
                status: '',
                description: 'Cost Performance'
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
                show_queries: true,
                user_input_start_date: '',
                user_input_end_date: '',
                user_input_amount: 0,
                selectedDataType: {},
                selectedSolrCollection: "",
                //solrCollectionList:[],
                info_description: 'Cost Performance chart.',
                selectedDataSource: {name: ''},
                dataSourceList: []
            };

            // Set panel's default values
            _.defaults($scope.panel, _d);

            if ($scope.panel.user_input_start_date === '') $scope.panel.user_input_start_date = moment().subtract(1, 'y').format('YYYY-MM-DD');
            if ($scope.panel.user_input_end_date === '')$scope.panel.user_input_end_date = moment().format('YYYY-MM-DD');
            if ($scope.panel.user_input_amount == 0) $scope.panel.user_input_amount = 100000;

            if (typeof $scope.panel.span === "undefined" || $scope.panel.span === '') $scope.panel.span = 12;
            if ($scope.panel.selectedDataType === "") $scope.panel.selectedDataType = "per hit";

            $scope.panel.solrCollectionList = [];
            $scope.panel.dataSourceList = [];
            for (var item in $scope.userSolrCollection) {
                $scope.panel.dataSourceList.push(config[$scope.userSolrCollection[item].collectionName]);
            }
            //console.log(""+JSON.stringify($scope.panel.dataSourceList));
            if ($scope.panel.selectedDataSource.name === "") {
                for (var item in $scope.userSolrCollection) {
                    if ($scope.userSolrCollection[item].isDefault == 1) {
                        $scope.panel.selectedDataSource.name = config[$scope.userSolrCollection[item].collectionName];
                    }
                }
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
                var tempdata = $scope.data;
                var response = "Date," + $scope.panel.selectedDataType + " per Dollar\n";
                for (var item in tempdata) {
                    //console.log(tempdata[item].date + "," + tempdata[item].close);
                    //response += tempdata[item].date + "," + tempdata[item].close + "\n";
                    var tempdate = new Date(tempdata[item].date);
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
                    response += month + "/" + day + "/" + year + " " + hours + ":" + minutes + ":" + seconds + "," + tempdata[item].close + "\n" ;
                }
                var basename = $scope.panel.title + "-" + $scope.panel.selectedDataSource.name + "-" + $scope.panel.selectedDataType;
                kbn.download_response_to_csv(response,basename);
            }
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

                switch(selectedType) {
                    case "ultrareach_collection":
                        if (selectedType === "Page hit") {
                            fq = fq + config.ultrareach_q_for_visit;
                        } else {
                            fq = fq + config.ultrareach_q_for_volume;
                        }
                    case "psiphon_collection":
                        if (selectedType === "Page view") {
                            fq = fq + config.psiphon_q_for_visit;
                        } else {
                            fq = fq + config.psiphon_q_for_volume;
                        }
                    default:
                        if (selectedType === 'Page hit' || selectedType === 'Page view') {
                            fq = fq + config.range_page_query;
                        } else {
                            fq = fq + config.range_traffic_query;
                        }
                }
                fq = fq.replace("_startdate_", filterSrv.getStartTime());
                fq = fq.replace("_enddate_", end_time);
                fq = fq.replace("_facetgap_", '%2B24HOURS');
                console.log('querystring:' + fq);
                return fq;
            };

            $scope.get_data = function () {
                // Show the spinning wheel icon
                $scope.panelMeta.loading = true;
                $scope.panel.field = config['timefield'];

                if ($scope.panel.user_input_amount < 0) { $scope.panel.user_input_amount = 0 }

                var d1 = "";
                var d2 = "";
                daysDiff = 1;
                var pricePerDay = 1;
                // call cost per day
                if ($scope.panel.user_input_start_date.length > 0
                    && $scope.panel.user_input_end_date.length > 0
                    && $scope.panel.user_input_amount > 0) {
                    d1 = moment($scope.panel.user_input_start_date);
                    d2 = moment($scope.panel.user_input_end_date);
                    daysDiff = moment.duration(d2.diff(d1)).asDays();
                    pricePerDay = $scope.panel.user_input_amount / daysDiff;
                }

                if (pricePerDay <= 0) {
                    pricePerDay = 1;
                }

                // Set Solr server
                $scope.panel.selectedSolrCollection = config[$scope.panel.selectedDataSource.name];
                $scope.sjs.client.server(dashboard.current.solr.server + $scope.panel.selectedSolrCollection);
                $scope.sjs.client.addExtraHeader($rootScope.token);
                var request = $scope.sjs.Request();

                // Construct Solr query
                $scope.panel.queries.query = $scope.get_query($scope.panel.selectedSolrCollection, $scope.panel.selectedDataType);

                // Set the additional custom query
                if ($scope.panel.queries.custom != null) {
                    request = request.setQuery($scope.panel.queries.query + $scope.panel.queries.custom);
                } else {
                    request = request.setQuery($scope.panel.queries.query);
                }

                console.log("inside cost per");
                console.log(request); 
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
                    try { data = results.facets.total.buckets; }
                    catch (err) { data = []; }
                    
                    if (data.length <= 0) $scope.panel.error = "No data returned.";
                    // convert solr data to tsv correct format , in order to run this program
                    for (var key in data) {
                        var tempDate = data[key].val;
                        var tempDailySum = data[key].daily_sum;

                        if (typeof tempDailySum === "undefined") {
                            tempDailySum = 0;
                        } else if ($scope.panel.selectedSolrCollection === 'wsi_collection' && $scope.panel.selectedDataType === 'Page view') {
                            tempDailySum = Math.round(tempDailySum * config.wsi_page_view_ratio);
                        }
                        tsvArray.push({"date": tempDate, "close": tempDailySum});
                    }

                    $scope.data = tsvArray;
                    $scope.data.forEach(function (d) { // Make every date in the csv data a javascript date object format
                        d.date = parseDate(d.date);
                        if (d.close > 0) {
                            d.close = (d.close / pricePerDay);
                        }
                    });
                    $scope.render();
                });
            };
        });

        module.directive('costperformanceChart', function (querySrv, dashboard, filterSrv) {
            return {
                restrict: 'E',
                link: function (scope, element) {
                    scope.$on('render', function () { render_panel(); });

                    // Render the panel when resizing browser window
                    angular.element(window).bind('resize', function () { render_panel(); });

                    // Function for rendering panel
                    function render_panel() {
                        // Clear the panel
                        element.html('');
                        var parent_width = element.parent().width();
                        var margin = {top: 20, right: 20, bottom: 30, left: 50},
                            width = parent_width - margin.left - margin.right,
                            height = 500 - margin.top - margin.bottom;

                        var svg = d3.select(element[0]).append("svg")
                            .attr("width", parent_width) // - margin.left - margin.right  ) // this line controls svg's width
                            .attr("height", 500 + margin.top + margin.bottom) //height + margin.top + margin.bottom
                            .append("g")
                            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

                        var x = d3.time.scale().range([0, width - margin.right]);
                        var y = d3.scale.linear().range([height, 0]);

                        var xAxis = d3.svg.axis()
                            .scale(x)
                            .orient("bottom")
                            .tickSize(1)
                            .tickFormat(d3.time.format("%m/%d/%y" + " " + "%H:%M"));

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

                        var area = d3.svg.area()
                            .x(function (d) { return x(d.date); })
                            .y0(height)
                            .y1(function (d) { return y(d.close); });

                        var data2 = scope.data;
                        //var parseDate2 = d3.time.format("%Y-%m%-d").parse;
                        var valid_date_range = false;
                        if (scope.panel.user_input_start_date.length > 0
                            && scope.panel.user_input_end_date.length > 0
                            && scope.panel.user_input_amount > 0) {
                            if (moment(scope.panel.user_input_start_date) <= data2[0].date
                                && moment(scope.panel.user_input_end_date) >= data2[data2.length - 1].date) {
                                valid_date_range = true;
                            } else {
                                valid_date_range = false;
                            }
                        }
                        x.domain(d3.extent(data2, function (d) { return d.date; }));
                        y.domain([0, d3.max(data2, function (d) { return d.close; })]);
                        area.y0(y(0));

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

                        svg.append("g")
                            .append("text")
                            .attr("x", width / 2)
                            .attr("y", height + 40)
                            .text("Date");

                        svg.append("g")
                            .call(yAxis)
                            .append("text")
                            .attr("fill", "#000")
                            .attr("x", 3)
                            .attr("y", 6)
                            .attr("dy", "0.71em")
                            .attr("text-anchor", "start")
                            .text(function () {
                                if (scope.panel.selectedDataType === "Traffic volume") {
                                    return "Data Volume (Bytes) / dollar";
                                }
                                else {
                                    return scope.panel.selectedDataType + " / dollar";
                                }
                            });

                        svg.selectAll("path.domain")
                            .style("fill", "none")
                            .style("stroke", "#000");

                        svg.selectAll(".tick line")
                            .style("stroke", "#000")
                            .style("fill", "none");

                        svg.selectAll(".tick text")
                            .style('font-family', ' "Helvetica Neue", Helvetica, Arial, sans-serif')
                            .style("font-size", "12px");

                        svg.selectAll(".message")
                            .style('font-family', ' "Helvetica Neue", Helvetica, Arial, sans-serif')
                            .style("font-size", "12px");

                        var dateone = moment(data2[0].date);
                        var dateend = moment(data2[data2.length - 1].date);
                        var duration = moment.duration(dateend.diff(dateone));
                        var days = duration.asDays();

                        if (valid_date_range) {
                            if (days < 1) {
                                scope.panel.error = "Timepicker day range must be >= 2 days."
                            } else {
                                svg.append("path")
                                    .datum(data2)
                                    .attr("fill", "#067bc2")
                                    .attr('opacity', 0.7)
                                    .attr("d", area);
                            }
                        } else {
                            scope.panel.error = "The date range in the Time Window Panel must be within the " +
                                "Project Start/End Date in Cost Performance Chart."
                        }
                    }
                }
            };
        });
    });
