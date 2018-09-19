/*
 ## tagcloud

 ### Parameters
 * size :: top N
 * alignment :: How should I arrange the words in cloud 'horizontal and vertical' or 'Random'
 * fontScale :: Increase the font scale for all words
 * ignoreStopWords :: Whether to Ignore Stop Words
 */
define([
        'angular',
        'config',
        'app',
        'underscore',
        'jquery',
        'kbn',
        'd3',
        './d3.layout.cloud',
        './stopWords'
    ],
    function (angular, config, app, _, $, kbn, d3) {
        'use strict';

        var module = angular.module('kibana.panels.tagcloud', []);
        app.useModule(module);

        module.controller('tagcloud', function ($scope, querySrv, dashboard, filterSrv, $rootScope) {
            $scope.panelMeta = {
                modals: [{
                    description: "Information",
                    icon: "icon-info-sign",
                    partial: "app/partials/inspector.html",
                    show: $scope.panel.spyable
                }],
                //editorTabs: [{
                //  title: 'Queries',
                //  src: 'app/partials/querySelect.html'
                //}],
                exportfiletocsv:true,
                status: "",
                description: "Display the tag cloud of the top N words from a specified field."
            };

            // Set and populate defaults
            var _d = {
                queries: {
                    mode: 'all',
                    ids: [],
                    query: '*:*',
                    custom: ''
                },
                field: '',
                size: 10,
                alignment: 'vertical and horizontal',
                fontScale: 1,
                ignoreStopWords: false,
                spyable: true,
                show_queries: true,
                error: '',
                selectedSolrCollection: "",
                //solrCollectionList:[],
                dataSourceList: [],
                selectedDataSource: {name: ''},
                selectedDataType: {},
            };
            _.defaults($scope.panel, _d);

            if (typeof $scope.panel.selectedSolrCollection === "undefined") $scope.panel.selectedSolrCollection = "";
            if (typeof $scope.panel.solrCollectionList === "undefined") $scope.panel.solrCollectionList = [];
            $scope.panel.solrCollectionList = [];
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
            $scope.exportfiletocsv = function() {
                console.log(JSON.stringify($scope.data));
                var tempdata = $scope.data;
                var response = $scope.panel.title + ",Value\n";
                if (tempdata != "undefined") {

                    for (var item in tempdata) {
                        console.log(JSON.stringify(tempdata[item].label) + "," + JSON.stringify(tempdata[item].data));
                        
                        response = response +  tempdata[item].label + "," + tempdata[item].data + "\n";
                    }
                }
                //var response = $scope.data;//"date,name\n12-12-2018,tom";
                var basename = $scope.panel.title + "-" + $scope.panel.selectedDataSource.name + "-" + $scope.panel.selectedDataType;;
                //console.log(JSON.stringify($scope.data[0].data));
               

                //response.then(function(response) {
                    kbn.download_response_to_csv(response,basename);
                //});
            };          

            $scope.init = function () {
                $scope.hits = 0;
                $scope.$on('refresh', function () {
                    $scope.get_data();
                });
                $scope.get_data();
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
                    fq = fq + config.term_page_query;
                } else {
                    fq = fq + config.term_traffic_query;
                }

                fq = fq.replace("_startdate_", filterSrv.getStartTime());
                fq = fq.replace("_enddate_", end_time);
                fq = fq.replace("_panelfield_", $scope.panel.field);
                fq = fq.replace("_limit_", $scope.panel.size);

                //console.log('querystring:' + fq);
                return fq;
            };

            $scope.get_data = function () {
                // Make sure we have everything for the request to complete
                //alert($rootScope.token);

                if (dashboard.indices.length === 0) {
                    return;
                }
                delete $scope.panel.error;
                $scope.panelMeta.loading = true;
                var request, results;

                //$scope.sjs.client.server(dashboard.current.solr.server + dashboard.current.solr.core_name);
                $scope.panel.selectedSolrCollection = config[$scope.panel.selectedDataSource.name];
                $scope.sjs.client.server(dashboard.current.solr.server + $scope.panel.selectedSolrCollection);
                $scope.sjs.client.addExtraHeader($rootScope.token);

                request = $scope.sjs.Request().indices(dashboard.indices);
                $scope.panel.queries.ids = querySrv.idsByMode($scope.panel.queries);

                // Populate the inspector panel
                $scope.inspector = angular.toJson(JSON.parse(request.toString()), true);

                // Build Solr query
              /*  var fq = '';
                if (filterSrv.getSolrFq()) {
                    fq = '&' + filterSrv.getSolrFq();
                }
                ;
                fq = filterSrv.replaceSolrCollectionTimefieldByVendor($scope.panel.selectedSolrCollection, fq);
                var wt_json = '&wt=json';
                var rows_limit = '&rows=0'; // for terms, we do not need the actual response doc, so set rows=0
                var facet = '&facet=true&facet.field=' + $scope.panel.field + '&facet.limit=' + $scope.panel.size;

                // Set the panel's query
                //$scope.panel.queries.query = querySrv.getORquery() + wt_json + rows_limit + fq + facet;

                var mapQuery = '';
                var start_time = filterSrv.getStartTime();
                var end_time = filterSrv.getEndTime();
                if (end_time == '*') {
                    end_time = 'NOW'
                }
                ;

                if ($scope.panel.selectedSolrCollection === "wsi_collection") {
                    mapQuery = config.term_page_query;
                }
                ;
                if ($scope.panel.selectedSolrCollection === "ultrareach_collection") {
                    mapQuery = config.ultrareach_q_for_visit + config.term_page_query;
                }
                ;
                if ($scope.panel.selectedSolrCollection === "psiphon_collection") {
                    mapQuery = config.psiphon_q_for_visit + config.term_page_query;
                }
                ;
                mapQuery = mapQuery.replace("_startdate_", start_time);
                mapQuery = mapQuery.replace("_enddate_", end_time);
                mapQuery = mapQuery.replace("_panelfield_", $scope.panel.field);
                mapQuery = mapQuery.replace("_limit_", $scope.panel.size);
                //console.log($scope.panel.selectedSolrCollection);
                //console.log("config map query " + config.map_query);
                //console.log("map query "+ mapQuery );
                //$scope.panel.queries.query = querySrv.getORquery() + mapQuery;*/


                $scope.panel.queries.query = $scope.get_query($scope.panel.selectedSolrCollection, $scope.panel.selectedDataType);


                // Set the additional custom query
                if ($scope.panel.queries.custom != null) {
                    request = request.setQuery($scope.panel.queries.query + $scope.panel.queries.custom);
                } else {
                    request = request.setQuery($scope.panel.queries.query);
                }

                results = request.doSearch();
                // Populate scope when we have results
                results.then(function (results) {
                    // Check for error and abort if found
                    if (!(_.isUndefined(results.error))) {
                        $scope.panel.error = $scope.parse_error(results.error.msg);
                        return;
                    }

                    var sum = 0;
//          var k = 0;
                    var missing = 0;
                    $scope.panelMeta.loading = false;
                    $scope.hits = results.response.numFound;
                    $scope.data = [];
                    $scope.maxRatio = 0;


                    $scope.yaxis_min = 0;
                       
                    var v = [];
                    try {
                        v = results.facets.total.buckets;
                    } catch (error) {
                        console.log("no result from map" + error);
                    }
                    
                    
                    for (var i = 0; i < v.length; i++) {
                        var term = v[i].val;
                        var count = v[i].daily_sum;

                        if ($scope.panel.selectedSolrCollection === 'wsi_collection' && $scope.panel.selectedDataType === 'Page view') {
                            count = Math.round(count * config.wsi_page_view_ratio);
                        }
                        
                        sum += count;

                        // if ignoreStopWords is enabled, skip this term.
                        if ($scope.panel.ignoreStopWords && (stopwords.indexOf(term.toLowerCase()) > -1)) {
                            continue;
                        }
                        if (term === null) {
                            missing = count;
                        } else {
                            // if count = 0, do not add it to the chart, just skip it
                            if (count === 0) {
                                continue;
                            }
                            var slice = {
                                label: term,
                                data: count,
                                actions: true
                            };
                            if (count / $scope.hits > $scope.maxRatio) {
                                $scope.maxRatio = count / $scope.hits;
                            }
                            $scope.data.push(slice);
                        }
                    }
                    ;

                    /*
                     _.each(results.facet_counts.facet_fields, function(v) {
                     for (var i = 0; i < v.length; i++) {
                     var term = v[i];
                     i++;
                     var count = v[i];
                     sum += count;

                     // if ignoreStopWords is enabled, skip this term.
                     if ($scope.panel.ignoreStopWords && (stopwords.indexOf(term.toLowerCase()) > -1)) {
                     continue;
                     }

                     if (term === null) {
                     missing = count;
                     } else {
                     // if count = 0, do not add it to the chart, just skip it
                     if (count === 0) {
                     continue;
                     }
                     var slice = {
                     label: term,
                     data: count,
                     actions: true
                     };
                     if (count / $scope.hits > $scope.maxRatio) {
                     $scope.maxRatio = count / $scope.hits;
                     }
                     $scope.data.push(slice);
                     }
                     }
                     });
                     */
                    $scope.$emit('render');
                });
            };

            $scope.set_refresh = function (state) {
                $scope.refresh = state;
                // if 'count' mode is selected, set decimal_points to zero automatically.
                if ($scope.panel.mode === 'count') {
                    $scope.panel.decimal_points = 0;
                }
            };

            $scope.close_edit = function () {
                if ($scope.refresh) {
                    $scope.get_data();
                }
                $scope.refresh = false;
                $scope.$emit('render');
            };
        });

        module.directive('tagcloudChart', function (/*querySrv, dashboard, filterSrv*/) {
            return {
                restrict: 'A',
                link: function (scope, element) {

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

                        function draw(words) {
                            d3.select(el).append("svg")
                                .attr("width", width)
                                .attr("height", height)
                                .append("g")
                                .attr("transform", "translate(" + (width - 20) / 2 + "," + (height - 20) / 2 + ")")
                                .selectAll("text")
                                .data(words)
                                .enter().append("text")
                                .style("font-size", function (d) {
                                    return d.size + "px";
                                })
                                .style("font-family", "Impact, Haettenschweiler, 'Franklin Gothic Bold', Charcoal, 'Helvetica Inserat', 'Bitstream Vera Sans Bold', 'Arial Black', 'sans-serif'")
                                .style("fill", function (d, i) {
                                    //return  color(i);
                                    return fill(i);
                                })
                                .attr("text-anchor", "middle")
                                .attr("transform", function (d) {
                                    return "translate(" + [d.x, d.y] + ")rotate(" + d.rotate + ")";
                                })
                                .text(function (d) {
                                    return d.text;
                                });
                        }

                        element.html("");

                        var el = element[0];
                        var width = element.parent().width();
                        var height = parseInt(scope.row.height);

                        var fill = d3.scale.category20();
                        /*
                         var color = d3.scale.linear()
                         .domain([0, 1, 2, 3, 4, 5, 6, 10, 15, 20, 100])
                         .range(["#7EB26D", "#EAB839", "#6ED0E0", "#EF843C", "#E24D42", "#1F78C1", "#BA43A9", "#705DA0", "#890F02", "#0A437C", "#6D1F62", "#584477"]);
                         */

                        var scale = d3.scale.linear().domain([0, scope.maxRatio]).range([0, 30]);
                        var randomRotate = d3.scale.linear().domain([0, 1]).range([-90, 90]);

                        d3.layout.cloud().size([width - 20, height - 20])
                            .words(scope.data.map(function (d) {
                                return {
                                    text: d.label,
                                    size: 5 + scale(d.data / scope.hits) + parseInt(scope.panel.fontScale)
                                };
                            })).rotate(function () {
                            if (scope.panel.alignment === 'vertical and horizontal') {
                                return ~~(Math.random() * 2) * -90;
                            } else if (scope.panel.alignment === 'horizontal') {
                                return 0;
                            }
                            else if (scope.panel.alignment === 'vertical(+90)') {
                                return 90;
                            }
                            else if (scope.panel.alignment === 'vertical(-90)') {
                                return -90;
                            }
                            else {
                                return randomRotate(Math.random());
                            }
                        })
                            .font("sans-serif")
                            .fontSize(function (d) {
                                return d.size;
                            })
                            .on("end", draw)
                            .start();


                    }

                }
            };
        });

    });
