/*

 ## History

 ### Parameters
 * auto_int :: Auto calculate data point interval?
 * resolution ::  If auto_int is enables, shoot for this many data points, rounding to
 sane intervals
 * interval :: Datapoint interval in elasticsearch date math format (eg 1d, 1w, 1y, 5y)
 * fill :: Only applies to line charts. Level of area shading from 0-10
 * linewidth ::  Only applies to line charts. How thick the line should be in pixels
 While the editor only exposes 0-10, this can be any numeric value.
 Set to 0 and you'll get something like a scatter plot
 * timezone :: This isn't totally functional yet. Currently only supports browser and utc.
 browser will adjust the x-axis labels to match the timezone of the user's
 browser
 * spyable ::  Dislay the 'eye' icon that show the last elasticsearch query
 * zoomlinks :: Show the zoom links?
 * bars :: Show bars in the chart
 * stack :: Stack multiple queries. This generally a crappy way to represent things.
 You probably should just use a line chart without stacking
 * points :: Should circles at the data points on the chart
 * lines :: Line chart? Sweet.
 * legend :: Show the legend?
 * x-axis :: Show x-axis labels and grid lines
 * y-axis :: Show y-axis labels and grid lines
 * interactive :: Allow drag to select time range

 */
define([
        'angular',
        'app',
        'jquery',
        'underscore',
        'kbn',
        'moment',
        './timeSeries',
        'config',
        'jquery.flot',
        'jquery.flot.pie',
        'jquery.flot.selection',
        'jquery.flot.time',
        'jquery.flot.stack',
        'jquery.flot.stackpercent',
        'jquery.flot.axislabels'
    ],
    function (angular, app, $, _, kbn, moment, timeSeries, config) {
        'use strict';

        var module = angular.module('kibana.panels.history', []);
        app.useModule(module);

        module.controller('history', function ($scope, $q, querySrv, dashboard, filterSrv, $rootScope) {
            $scope.panelMeta = {
                modals: [
                    {
                        description: "Information",
                        icon: "icon-info-sign",
                        partial: "app/partials/inspector.html",
                        show: true,
                        show_queries: false,
                        show_help_message: false
                    }
                ],
                exportfiletocsv:true,
                status: "",
                description: "A bucketed time series chart of the current query, including all applied time and non-time filters, when used in <i>count</i> mode. Uses Solr�s facet.range query parameters. In <i>values</i> mode, it plots the value of a specific field over time, and allows the user to group field values by a second field."
            };

            // Set and populate defaults
            var _d = {
                mode: 'count',
                queries: {
                    mode: 'all',
                    ids: [],
                    query: '*:*',
                    custom: ''
                },
                max_rows: 100000,  // maximum number of rows returned from Solr (also use this for group.limit to simplify UI setting)
                value_field: null,
                group_field: null,
                auto_int: true,
                resolution: 100,
                interval: '5m',
                intervals: ['auto', '1s', '1m', '5m', '10m', '30m', '1h', '3h', '12h', '1d', '1w', '1M', '1y'],
                fill: 0,
                linewidth: 3,
                timezone: 'browser', // browser, utc or a standard timezone
                /*spyable     : true,*/
                zoomlinks: true,
                bars: true,
                stack: true,
                points: false,
                lines: false,
                lines_smooth: false, // Enable 'smooth line' mode by removing zero values from the plot.
                legend: true,
                'x-axis': true,
                'y-axis': true,
                percentage: false,
                interactive: true,
                options: true,
                /*show_queries: false,*/
                selectedSolrCollection: "",
                //solrCollectionList:[],
                tooltip: {
                    value_type: 'cumulative',
                    query_as_alias: false
                },
                info_description: 'History Chart.',
                selectedDataSource: {name: ''},
                dataSourceList: [],
                selectedDataType: {}
            };

            _.defaults($scope.panel, _d);
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
            $scope.init = function () {
                if ($scope.panel.selectedSolrCollection === "") {
                    for (var item in $scope.userSolrCollection) {
                        //console.log("inside loop");
                        if ($scope.userSolrCollection[item].isDefault == 1) {
                            $scope.panel.selectedSolrCollection = $scope.userSolrCollection[item].collectionName;
                            //console.log("selected solr collection   :::"+$scope.panel.selectedSolrCollection);
                        }
                    }
                }

                // Hide view options by default
                $scope.options = false;
                $scope.$on('refresh', function () { $scope.get_data(); });
                $scope.get_data();
            };
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
                var tempdata = $scope.data[0].data;
                var response = "Date,Value\n";
                if (tempdata != "undefined") {            
                
                    for (var item in tempdata) {
                        //console.log(JSON.stringify(tempdata[item][0]) + "," + JSON.stringify(tempdata[item][1]));
                             
                        var tempDateString = new Date(tempdata[item][0]); 
                        //response += tempDateString + "," + tempdata[item][1] + "\n";                      
                        response += $scope.converttousdatetime(tempdata[item][0])+ "," + tempdata[item][1] + "\n";
                    }
                }
                
                var basename = $scope.panel.title + "-" + $scope.panel.selectedDataSource.name + "-" + $scope.panel.selectedDataType;
                //console.log(JSON.stringify($scope.data[0].data));
                kbn.download_response_to_csv(response,basename);
                kbn.download_response_to_xlsx();
            };
            
            $scope.set_interval = function (interval) {
                if (interval !== 'auto') {
                    $scope.panel.auto_int = false;
                    $scope.panel.interval = interval;
                } else {
                    $scope.panel.auto_int = true;
                }
            };

            $scope.interval_label = function (interval) {
                return $scope.panel.auto_int && interval === $scope.panel.interval ? interval + " (auto)" : interval;
            };

            /**
             * The time range effecting the panel
             * @return {[type]} [description]
             */
            $scope.get_time_range = function () {
                var range = $scope.range = filterSrv.timeRange('min');
                return range;
            };

            $scope.get_interval = function () {
                var interval = $scope.panel.interval,
                    range;
                if ($scope.panel.auto_int) {
                    range = $scope.get_time_range();
                    if (range) {
                        interval = kbn.secondsToHms(
                            kbn.calculate_interval(range.from, range.to, $scope.panel.resolution, 0) / 1000
                        );
                    }
                }
                $scope.panel.interval = interval || '10m';
                return $scope.panel.interval;
            };

            $scope.get_query = function (selectedCollection, selectedType, id) {
                var end_time = filterSrv.getEndTime();
                if (end_time === "*") {
                    end_time = "NOW"
                }
                var fq = querySrv.getQuery(id);

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
                fq = fq.replace("_facetgap_", $scope.sjs.convertFacetGap($scope.panel.interval));
                //console.log('querystring:' + fq);
                return fq;
            };
            /**
             * Fetch the data for a chunk of a queries results. Multiple segments occur when several indicies
             * need to be consulted (like timestamped logstash indicies)
             *
             * The results of this function are stored on the scope's data property. This property will be an
             * array of objects with the properties info, time_series, and hits. These objects are used in the
             * render_panel function to create the historgram.
             *
             * !!! Solr does not need to fetch the data in chunk because it uses a facet search and retrieve
             * !!! all events from a single query.
             *
             * @param {number} segment   The segment count, (0 based)
             * @param {number} query_id  The id of the query, generated on the first run and passed back when
             *                            this call is made recursively for more segments
             */
            $scope.get_data = function (segment, query_id) {
                console.log("inside history");
                if (_.isUndefined(segment)) {
                    segment = 0;
                }
                delete $scope.panel.error;

                // Make sure we have everything for the request to complete
                if (dashboard.indices.length === 0) {
                    return;
                }
                var _range = $scope.get_time_range();
                var _interval = $scope.get_interval(_range);

                if ($scope.panel.auto_int) {
                    $scope.panel.interval = kbn.secondsToHms(
                        kbn.calculate_interval(_range.from, _range.to, $scope.panel.resolution, 0) / 1000);
                }

                $scope.panelMeta.loading = true;

                // Solr
                //$scope.sjs.client.server(dashboard.current.solr.server + dashboard.current.solr.core_name);
                $scope.panel.selectedSolrCollection = config[$scope.panel.selectedDataSource.name];
                $scope.sjs.client.server(dashboard.current.solr.server + $scope.panel.selectedSolrCollection);
                $scope.sjs.client.addExtraHeader($rootScope.token);
                //alert(dashboard.current.solr.server + dashboard.current.solr.core_name);
                var request = $scope.sjs.Request().indices(dashboard.indices[segment]);
                $scope.panel.queries.ids = querySrv.idsByMode($scope.panel.queries);


                $scope.panel.queries.query = "";
                // Build the query
                _.each($scope.panel.queries.ids, function (id) {
                    var query = $scope.sjs.FilteredQuery(
                        querySrv.getEjsObj(id),
                        filterSrv.getBoolFilter(filterSrv.ids)
                    );

                    var facet = $scope.sjs.DateHistoryFacet(id);
                    if ($scope.panel.mode === 'count') {
                        facet = facet.field(filterSrv.getTimeField());
                    } else {
                        if (_.isNull($scope.panel.value_field)) {
                            $scope.panel.error = "In " + $scope.panel.mode + " mode a field must be specified";
                            return;
                        }
                        facet = facet.keyField(filterSrv.getTimeField()).valueField($scope.panel.value_field);
                    }
                    facet = facet.interval(_interval).facetFilter($scope.sjs.QueryFilter(query));
                    request = request.facet(facet).size(0);

                });
                //alert(request);
                // Populate the inspector panel
                $scope.populate_modal(request);
                var mypromises = [];

                _.each($scope.panel.queries.ids, function (id) {
                    $scope.panel.queries.query = $scope.get_query($scope.panel.selectedSolrCollection, $scope.panel.selectedDataType, id);
                    if ($scope.panel.queries.custom !== null) {
                        request = request.setQuery($scope.panel.queries.query + $scope.panel.queries.custom);
                    } else {
                        request = request.setQuery($scope.panel.queries.query);
                    }
                    mypromises.push(request.doSearch());
                });
                //alert(request);
                if (dashboard.current.services.query.ids.length >= 1) {
                    $q.all(mypromises).then(function (results) {
                        $scope.panelMeta.loading = false;
                        if (segment === 0) {
                            $scope.hits = 0;
                            $scope.data = [];
                            query_id = $scope.query_id = new Date().getTime();
                        }
                        // Convert facet ids to numbers
                        // var facetIds = _.map(_.keys(results.facets),function(k){return parseInt(k, 10);});
                        //var facetIds = [0]; // Need to fix this

                        // Make sure we're still on the same query/queries
                        // TODO: We probably DON'T NEED THIS unless we have to support multiple queries in query module.
                        // if ($scope.query_id === query_id && _.difference(facetIds, $scope.panel.queries.ids).length === 0) {
                        var i = 0,
                            time_series,
                            hits;

                        _.each($scope.panel.queries.ids, function (id, index) {
                            // Check for error and abort if found
                            if (!(_.isUndefined(results[index].error))) {
                                $scope.panel.error = $scope.parse_error(results[index].error.msg);
                                return;
                            }
                            // we need to initialize the data variable on the first run,
                            // and when we are working on the first segment of the data.
                            if (_.isUndefined($scope.data[i]) || segment === 0) {
                                time_series = new timeSeries.ZeroFilled({
                                    interval: _interval,
                                    start_date: _range && _range.from,
                                    end_date: _range && _range.to,
                                    fill_style: 'minimal'
                                });
                                hits = 0;
                            } else {
                                time_series = $scope.data[i].time_series;
                                // Bug fix for wrong event count:
                                //   Solr don't need to accumulate hits count since it can get total count from facet query.
                                //   Therefore, I need to set hits and $scope.hits to zero.
                                // hits = $scope.data[i].hits;
                                hits = 0;
                                $scope.hits = 0;
                            }

                            // Solr facet counts response is in one big array.
                            // So no need to get each segment like Elasticsearch does.
                            var entry_time, entries, entry_value;
                            if ($scope.panel.mode === 'count') {
                                // added by yip, using different solr query
                                entries = results[index].facets.total.buckets;
                                for (var j = 0; j < entries.length; j++) {
                                    entry_time = new Date(entries[j].val).getTime(); // convert to millisec
                                    //j++;

                                    var entry_count = entries[j].daily_sum;

                                    // Short term fix for display estimated page view for WSI data
                                    if (typeof entry_count === "undefined") {
                                        entry_count = 0;
                                    } else if ($scope.panel.selectedSolrCollection === 'wsi_collection' && $scope.panel.selectedDataType === 'Page view') {
                                        entry_count = Math.round(entry_count * config.wsi_page_view_ratio);
                                    }
                                    time_series.addValue(entry_time, entry_count);
                                    hits += entry_count; // The series level hits counter
                                    $scope.hits += entry_count; // Entire dataset level hits counter
                                }

                                // Entries from facet_ranges counts
                                //entries = results[index].facet_counts.facet_ranges[time_field].counts;
                                //for (var j = 0; j < entries.length; j++) {
                                //  entry_time = new Date(entries[j]).getTime(); // convert to millisec
                                //  j++;
                                //  var entry_count = entries[j];
                                //  time_series.addValue(entry_time, entry_count);
                                //  hits += entry_count; // The series level hits counter
                                //  $scope.hits += entry_count; // Entire dataset level hits counter
                                //}
                            } else if ($scope.panel.mode === 'values') {
                                if ($scope.panel.group_field) {
                                    // Group By Field is specified
                                    var groups = results[index].grouped[$scope.panel.group_field].groups;

                                    for (var j = 0; j < groups.length; j++) { // jshint ignore: line
                                        var docs = groups[j].doclist.docs;
                                        var group_time_series = new timeSeries.ZeroFilled({
                                            interval: _interval,
                                            start_date: _range && _range.from,
                                            end_date: _range && _range.to,
                                            fill_style: 'minimal'
                                        });
                                        hits = 0;

                                        // loop through each group results
                                        for (var k = 0; k < docs.length; k++) {
                                            entry_time = new Date(docs[k][time_field]).getTime(); // convert to millisec
                                            entry_value = docs[k][$scope.panel.value_field];
                                            group_time_series.addValue(entry_time, entry_value);
                                            hits += 1;
                                            $scope.hits += 1;
                                        }

                                        $scope.data[j] = {
                                            // info: querySrv.list[id],
                                            // Need to define chart info here according to the results, cannot use querySrv.list[id]
                                            info: {
                                                alias: groups[j].groupValue,
                                                color: querySrv.colors[j],

                                            },
                                            time_series: group_time_series,
                                            hits: hits
                                        };
                                    }
                                } else { // Group By Field is not specified
                                    entries = results[index].response.docs;
                                    for (var j = 0; j < entries.length; j++) { // jshint ignore: line
                                        entry_time = new Date(entries[j][time_field]).getTime(); // convert to millisec
                                        entry_value = entries[j][$scope.panel.value_field];
                                        time_series.addValue(entry_time, entry_value);
                                        hits += 1;
                                        $scope.hits += 1;
                                    }

                                    $scope.data[i] = {
                                        info: querySrv.list[id],
                                        time_series: time_series,
                                        hits: hits
                                    };
                                }
                            }

                            if ($scope.panel.mode !== 'values') {
                                $scope.data[i] = {
                                    info: querySrv.list[id],
                                    time_series: time_series,
                                    hits: hits
                                };
                            }

                            i++;
                        });

                        // Tell the history directive to render.
                        $scope.$emit('render');
                        // }
                    });
                }
            };

            // function $scope.zoom
            // factor :: Zoom factor, so 0.5 = cuts timespan in half, 2 doubles timespan
            $scope.zoom = function (factor) {
                var _range = filterSrv.timeRange('min');
                var _timespan = (_range.to.valueOf() - _range.from.valueOf());
                var _center = _range.to.valueOf() - _timespan / 2;

                var _to = (_center + (_timespan * factor) / 2);
                var _from = (_center - (_timespan * factor) / 2);

                // If we're not already looking into the future, don't.
                if (_to > Date.now() && _range.to < Date.now()) {
                    var _offset = _to - Date.now();
                    _from = _from - _offset;
                    _to = Date.now();
                }

                var time_field = filterSrv.getTimeField();
                if (factor > 1) {
                    filterSrv.removeByType('time');
                }

                filterSrv.set({
                    type: 'time',
                    from: moment.utc(_from).toDate(),
                    to: moment.utc(_to).toDate(),
                    field: time_field
                });

                dashboard.refresh();
            };

            // I really don't like this function, too much dom manip. Break out into directive?
            $scope.populate_modal = function (request) {
                $scope.inspector = angular.toJson(JSON.parse(request.toString()), true);
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

        });

        module.directive('historyChart', function (dashboard, filterSrv) {
            return {
                restrict: 'A',
                template: '<div></div>',
                link: function (scope, elem) {

                    // Receive render events
                    scope.$on('render', function () {
                        render_panel();
                    });

                    // Re-render if the window is resized
                    angular.element(window).bind('resize', function () {
                        render_panel();
                    });

                    // Function for rendering panel
                    function render_panel() {
                        // IE doesn't work without this
                        elem.css({height: scope.panel.height || scope.row.height});

                        // Populate from the query service
                        try {
                            _.each(scope.data, function (series) {
                                series.label = series.info.alias;
                                series.color = series.info.color;
                            });
                        } catch (e) {
                            return;
                        }

                        // Set barwidth based on specified interval
                        var barwidth = kbn.interval_to_ms(scope.panel.interval);

                        var stack = scope.panel.stack ? true : null;

                        // Populate element
                        try {
                            var options = {
                                legend: {show: false},
                                series: {
                                    stackpercent: scope.panel.stack ? scope.panel.percentage : false,
                                    stack: scope.panel.percentage ? null : stack,
                                    lines: {
                                        show: scope.panel.lines,
                                        // Silly, but fixes bug in stacked percentages
                                        fill: scope.panel.fill === 0 ? 0.001 : scope.panel.fill / 10,
                                        lineWidth: scope.panel.linewidth,
                                        steps: false
                                    },
                                    bars: {
                                        show: scope.panel.bars,
                                        fill: 1,
                                        barWidth: barwidth / 1.8,
                                        zero: false,
                                        lineWidth: 0
                                    },
                                    points: {
                                        show: scope.panel.points,
                                        fill: 1,
                                        fillColor: false,
                                        radius: 5
                                    },
                                    shadowSize: 1
                                },
                                axisLabels: {
                                    show: false //true
                                },
                                yaxis: {
                                    show: scope.panel['y-axis'],
                                    min: null, // TODO - make this adjusted dynamicmally, and add it to configuration panel
                                    max: scope.panel.percentage && scope.panel.stack ? 100 : null,
                                    axisLabel: scope.panel.mode,
                                    label: "Count"
                                },
                                xaxis: {
                                    timezone: scope.panel.timezone,
                                    show: scope.panel['x-axis'],
                                    mode: "time",
                                    min: _.isUndefined(scope.range.from) ? null : scope.range.from.getTime(),
                                    max: _.isUndefined(scope.range.to) ? null : scope.range.to.getTime(),
                                    timeformat: time_format(scope.panel.interval),
                                    label: "Datetime",
                                    axisLabel: filterSrv.getTimeField()
                                },
                                label: { show: true },
                                grid: {
                                    backgroundColor: null,
                                    borderWidth: 0,
                                    hoverable: true,
                                    color: '#c8c8c8'
                                }
                            };

                            if (scope.panel.interactive) {
                                options.selection = {mode: "x", color: '#666'};
                            }

                            // when rendering stacked bars, we need to ensure each point that has data is zero-filled
                            // so that the stacking happens in the proper order
                            var required_times = [];
                            if (scope.data.length > 1) {
                                required_times = Array.prototype.concat.apply([], _.map(scope.data, function (query) {
                                    return query.time_series.getOrderedTimes();
                                }));
                                required_times = _.uniq(required_times.sort(function (a, b) {
                                    // decending numeric sort
                                    return a - b;
                                }), true);
                            }

                            for (var i = 0; i < scope.data.length; i++) {
                                scope.data[i].data = scope.data[i].time_series.getFlotPairs(required_times);
                                
                                
                            }

                            // ISSUE: SOL-76
                            // If 'lines_smooth' is enabled, loop through $scope.data[] and remove zero filled entries.
                            // Without zero values, the line chart will appear smooth as SiLK ;-)
                            if (scope.panel.lines_smooth) {
                                for (var i = 0; i < scope.data.length; i++) { // jshint ignore: line
                                    var new_data = [];
                                    for (var j = 0; j < scope.data[i].data.length; j++) {
                                        // if value of the timestamp !== 0, then add it to new_data
                                        if (scope.data[i].data[j][1] !== 0) {
                                            new_data.push(scope.data[i].data[j]);
                                        }
                                    }
                                    scope.data[i].data = new_data;
                                }
                            }

                            scope.plot = $.plot(elem, scope.data, options);
                        } catch (e) {
                            // TODO: Need to fix bug => "Invalid dimensions for plot, width = 0, height = 200"
                            // console.log(e);
                        }
                    }

                    function time_format(interval) {
                        var _int = kbn.interval_to_seconds(interval);
                        if (_int >= 2628000) { return "%m/%y"; }
                        if (_int >= 86400) { return "%m/%d/%y"; }
                        if (_int >= 60) { return "%H:%M<br/>%m/%d"; }
                        return "%H:%M:%S";
                    }

                    var $tooltip = $('<div>');
                    elem.bind("plothover", function (event, pos, item) {
                        var group, value;
                        if (item) {
                            if (item.series.info.alias || scope.panel.tooltip.query_as_alias) {
                                group = '<small style="font-size:0.9em;">' +
                                    '<i class="icon-circle" style="color:' + item.series.color + ';"></i>' + ' ' +
                                    (item.series.info.alias || item.series.info.query) +
                                    '</small><br>';
                            } else {
                                group = kbn.query_color_dot(item.series.color, 15) + ' ';
                            }
                            if (scope.panel.stack && scope.panel.tooltip.value_type === 'individual') {
                                value = item.datapoint[1] - item.datapoint[2];
                            } else {
                                value = item.datapoint[1];
                            }
                            $tooltip
                                .html(
                                    group + dashboard.numberWithCommas(value) + " @ " + (scope.panel.timezone === 'utc' ? moment.utc(item.datapoint[0]).format('MM/DD HH:mm:ss') : moment(item.datapoint[0]).format('MM/DD HH:mm:ss'))
                                    // group + dashboard.numberWithCommas(value) + " @ " + moment(item.datapoint[0]).format('MM/DD HH:mm:ss')
                                    // group + dashboard.numberWithCommas(value) + " @ " + moment(item.datapoint[0])
                                )
                                .place_tt(pos.pageX, pos.pageY);
                        } else {
                            $tooltip.detach();
                        }
                    });

                    elem.bind("plotselected", function (event, ranges) {
                        filterSrv.set({
                            type: 'time',
                            // from  : moment.utc(ranges.xaxis.from),
                            // to    : moment.utc(ranges.xaxis.to),
                            from: moment.utc(ranges.xaxis.from).toDate(),
                            to: moment.utc(ranges.xaxis.to).toDate(),
                            field: filterSrv.getTimeField()
                        });
                        dashboard.refresh();
                    });
                }
            };
        });

    });
