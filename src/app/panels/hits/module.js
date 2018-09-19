/*

 ## Hits

 ### Parameters
 * style :: A hash of css styles
 * arrangement :: How should I arrange the query results? 'horizontal' or 'vertical'
 * chart :: Show a chart? 'none', 'bar', 'pie'
 * donut :: Only applies to 'pie' charts. Punches a hole in the chart for some reason
 * tilt :: Only 'pie' charts. Janky 3D effect. Looks terrible 90% of the time.
 * lables :: Only 'pie' charts. Labels on the pie?

 */
define([
    'angular',
    'config',
    'app',
    'underscore',
    'jquery',
    'kbn',

    'jquery.flot',
    'jquery.flot.pie'
], function (angular, config, app, _, $, kbn) {
    'use strict';

    var module = angular.module('kibana.panels.hits', []);

    app.useModule(module);

    module.controller('hits', function ($scope, $q, querySrv, dashboard, filterSrv, $rootScope) {
        $scope.panelMeta = {
            modals: [
                {
                    description: "Information",
                    icon: "icon-info-sign",
                    partial: "app/partials/inspector.html",
                    show: $scope.panel.spyable
                }
            ],
            //editorTabs : [
            //  {title:'Queries', src:'app/partials/querySelect.html'}
            //],
            status: "",
            description: "The total hits for the current query including all the applied filters."
        };

        // Set and populate defaults
        var _d = {
            queries: {
                mode: 'all',
                ids: [],
                query: '*:*',
                basic_query: '',
                custom: ''
            },
            style: {"font-size": '10pt'},
            arrangement: 'horizontal',
            chart: 'total',
            counter_pos: 'above',
            donut: false,
            tilt: false,
            labels: true,
            spyable: true,
            show_queries: true,
            show_stats: false,
            stats_type: 'mean',
            stats_field: '',
            stats_decimal_points: 2,
            selectedSolrCollection: "",
            //solrCollectionList:[],
            info_description: 'The total hits for the current query including all the applied filters.',
            selectedDataSource: {name: ''},
            dataSourceList: [],
            selectedDataType: {},
        };
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
       
        $scope.init = function () {
            $scope.hits = 0;
            $scope.$on('refresh', function () {
                $scope.get_data();
            });
            $scope.get_data();

        };


        $scope.get_query = function (selectedCollection, selectedType, id) {

            /*
             var fq = '';
             if (filterSrv.getSolrFq()) {
             fq = '&' + filterSrv.getSolrFq();
             }
             // if Show Stats
             var stats = '';
             if ($scope.panel.show_stats) {
             stats = '&stats=true&stats.field=' + $scope.panel.stats_field;
             }
             var wt_json = '&wt=json';
             var rows_limit = '&rows=0'; // for hits, we do not need the actual response doc, so set rows=0
             var json_facet = '&json.facet={total:%22sum(count)%22}';
             var promises = [];
             $scope.data = [];
             $scope.hits = 0;
             $scope.panel.queries.query = '';

             _.each($scope.panel.queries.ids, function(id) {
             var q = querySrv.getQuery(id) ;

             if ($scope.panel.selectedSolrCollection === "psiphon_collection") {q += '%20AND%20type_s:page_view';};
             if ($scope.panel.selectedSolrCollection === "ultrareach_collection") {q += '%20AND%20(type_s:http%20OR%20type_s:https)';};
             var temp_q =  q + fq + stats + wt_json + rows_limit + json_facet;
             $scope.panel.queries.query += temp_q + '\n';
             // Set the additional custom query
             if ($scope.panel.queries.custom !== null) {
             request = request.setQuery(temp_q + $scope.panel.queries.custom);
             } else {
             request = request.setQuery(temp_q);
             }
             promises.push(request.doSearch());
             });

             */


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
                fq = fq + config.total_page_query;
            } else {
                fq = fq + config.total_traffic_query;
            }

            fq = fq.replace("_startdate_", filterSrv.getStartTime());
            fq = fq.replace("_enddate_", end_time);
            //console.log('querystring:' + fq);
            return fq;
        };


        $scope.get_data = function () {
            delete $scope.panel.error;
            $scope.panelMeta.loading = true;

            // Make sure we have everything for the request to complete
            if (dashboard.indices.length === 0) {
                return;
            }

            // Solr
            $scope.panel.selectedSolrCollection = config[$scope.panel.selectedDataSource.name];
            $scope.sjs.client.server(dashboard.current.solr.server + $scope.panel.selectedSolrCollection);
            //$scope.sjs.client.server(dashboard.current.solr.server + dashboard.current.solr.core_name);
            $scope.sjs.client.addExtraHeader($rootScope.token);
            var request = $scope.sjs.Request().indices(dashboard.indices);

            $scope.panel.queries.ids = querySrv.idsByMode($scope.panel.queries);
            // Build the question part of the query
            _.each($scope.panel.queries.ids, function (id) {
                var _q = $scope.sjs.FilteredQuery(
                    querySrv.getEjsObj(id),
                    filterSrv.getBoolFilter(filterSrv.ids));

                request = request
                    .facet($scope.sjs.QueryFacet(id)
                        .query(_q)
                    ).size(0);
            });

            // Populate the inspector panel
            $scope.populate_modal(request);

            var promises = [];
            $scope.data = [];
            $scope.hits = 0;

            //Solr Search Query
            _.each($scope.panel.queries.ids, function (id) {
                $scope.panel.queries.query = $scope.get_query($scope.panel.selectedSolrCollection, $scope.panel.selectedDataType, id);

                // Set the additional custom query
                if ($scope.panel.queries.custom != null) {
                    request = request.setQuery($scope.panel.queries.query + $scope.panel.queries.custom);
                } else {
                    request = request.setQuery($scope.panel.queries.query);
                }

                promises.push(request.doSearch());
            });


            // Populate scope when we have results
            $q.all(promises).then(function (results) {
                _.each(dashboard.current.services.query.ids, function (id, i) {
                    $scope.panelMeta.loading = false;

                    var result_value;

                    // check what value to show, either total count or stats
                    if (!$scope.panel.show_stats) {
                        //result_value = results[i].response.numFound;
                        //$scope.hits += results[i].response.numFound;
                        result_value = results[i].facets.total;

                        // Short term fix for display estimated page view for WSI data
                        if (typeof result_value === "undefined") {
                            result_value = 0;
                        } else if ($scope.panel.selectedSolrCollection === 'wsi_collection' && $scope.panel.selectedDataType === 'Page view') {
                            result_value = Math.round(result_value * config.wsi_page_view_ratio);
                        }

                        $scope.hits += result_value;

                    } else {
                        result_value = results[i].stats.stats_fields[$scope.panel.stats_field][$scope.panel.stats_type];
                        $scope.hits += results[i].stats.stats_fields[$scope.panel.stats_field][$scope.panel.stats_type];
                        $scope.hits = $scope.hits.toFixed($scope.panel.stats_decimal_points);
                    }

                    // Check for error and abort if found
                    if (!(_.isUndefined(results[i].error))) {
                        $scope.panel.error = $scope.parse_error(results[i].error);
                        return;
                    }

                    var info = dashboard.current.services.query.list[id];

                    // Create series
                    $scope.data[i] = {
                        info: info,
                        id: id,
                        hits: result_value,
                        data: [[id, result_value]]
                    };
                    $scope.$emit('render');
                });
            });
        };

        $scope.set_refresh = function (state) {
            $scope.refresh = state;
            // if not show_stats, set stats_decimal_points to zero automatically.
            if (!$scope.panel.show_stats) {
                $scope.panel.stats_decimal_points = 0;
            }
        };

        $scope.close_edit = function () {
            if ($scope.refresh) {
                $scope.get_data();
            }
            $scope.refresh = false;
            $scope.$emit('render');
        };

        $scope.populate_modal = function (request) {
            $scope.inspector = angular.toJson(JSON.parse(request.toString()), true);
        };

    });


    module.directive('hitsChart', function (querySrv) {
        return {
            restrict: 'A',
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

                    try {
                        _.each(scope.data, function (series) {
                            series.label = series.info.alias;
                            series.color = series.info.color;
                        });
                    } catch (e) {
                        return;
                    }

                    // Populate element
                    try {
                        // Add plot to scope so we can build out own legend
                        if (scope.panel.chart === 'bar') {
                            scope.plot = $.plot(elem, scope.data, {
                                legend: {show: false},
                                series: {
                                    lines: {show: false,},
                                    bars: {show: true, fill: 1, barWidth: 0.8, horizontal: false},
                                    shadowSize: 1
                                },
                                yaxis: {show: true, min: 0, color: "#c8c8c8"},
                                xaxis: {show: false},
                                grid: {
                                    borderWidth: 0,
                                    borderColor: '#eee',
                                    color: "#eee",
                                    hoverable: true,
                                },
                                colors: querySrv.colors
                            });
                        }

                        if (scope.panel.chart === 'pie') {
                            scope.plot = $.plot(elem, scope.data, {
                                legend: {show: false},
                                series: {
                                    pie: {
                                        innerRadius: scope.panel.donut ? 0.4 : 0,
                                        tilt: scope.panel.tilt ? 0.45 : 1,
                                        radius: 1,
                                        show: true,
                                        combine: {
                                            color: '#999',
                                            label: 'The Rest'
                                        },
                                        stroke: {
                                            width: 0
                                        },
                                        label: {
                                            show: scope.panel.labels,
                                            radius: 2 / 3,
                                            formatter: function (label, series) {
                                                return '<div ng-click="build_search(panel.query.field,\'' + label + '\')' +
                                                    ' "style="font-size:8pt;text-align:center;padding:2px;color:white;">' +
                                                    label + '<br/>' + Math.round(series.percent) + '%</div>';
                                            },
                                            threshold: 0.1
                                        }
                                    }
                                },
                                //grid: { hoverable: true, clickable: true },
                                grid: {hoverable: true, clickable: true},
                                colors: querySrv.colors
                            });
                        }
                    } catch (e) {
                        elem.text(e);
                    }
                }

                var $tooltip = $('<div>');
                elem.bind("plothover", function (event, pos, item) {
                    if (item) {
                        var value = scope.panel.chart === 'bar' ?
                            item.datapoint[1] : item.datapoint[1][0][1];
                        $tooltip
                            .html(kbn.query_color_dot(item.series.color, 20) + ' ' + value.toFixed(0))
                            .place_tt(pos.pageX, pos.pageY);
                    } else {
                        $tooltip.remove();
                    }
                });

            }
        };
    });
});
