/*
 ## D3 Bar Chart with Tooltip Integrated with Banana.
 ## Demo URL: bl.ocks.org/Caged/6476579

 ### Parameters
 * field :: Field for Facet Query for Bar Chart Data.
 * size :: Maximum Number of Bars.
 */
define([
        'angular',
        'config',
        'app',
        'underscore',
        'jquery',
        'kbn',
        'd3',
        './d3.tip'
    ],
    function (angular, config, app, _, $, kbn, d3, d3tip) {
        'use strict';

        var module = angular.module('kibana.panels.comparisons', []);
        app.useModule(module);

        module.controller('comparisons', function ($scope, querySrv, dashboard, filterSrv, $rootScope) {
            $scope.panelMeta = {
                modals: [{
                    description: "Information",
                    icon: "icon-info-sign",
                    partial: "app/partials/inspector.html",
                    show: $scope.panel.spyable
                }]
            };

            // Set and populate defaults
            var _d = {
                queries: {
                    mode: 'all',
                    query: '*:*',
                    custom: ''
                },
                field: '',
                size: 10,
                spyable: true,
                show_queries: true,
                error: '',
                selectedSolrCollection: "",
                //solrCollectionList: [],
                info_description: 'Comparison between data sets.',
                selectedDataSource:'',
                dataSourceList:[]
            };
            _.defaults($scope.panel, _d);

            $scope.panel.solrCollectionList = [];
            $scope.panel.dataSourceList = [];           
            for (var item in $scope.userSolrCollection){               
                   $scope.panel.dataSourceList.push(config[$scope.userSolrCollection[item].collectionName]);
            };           
            if ($scope.panel.selectedDataSource === ''){
                   for (var item in $scope.userSolrCollection){                     
                        if ($scope.userSolrCollection[item].isDefault == 1){                        
                            $scope.panel.selectedDataSource = config[$scope.userSolrCollection[item].collectionName];                           
                        }
                   }
            }

            if ($scope.panel.field1 === '' || typeof $scope.panel.field1 === 'undefined') {
                $scope.panel.field1 = 'country_s';
            }
            if ($scope.panel.field2 === '' || typeof $scope.panel.field2 === 'undefined') {
                $scope.panel.field2 = 'type_s';
            }
            $scope.init = function () {
                $scope.hits = 0;
                $scope.$on('refresh', function () {
                    $scope.get_data();
                });
                $scope.get_data();
            };

            $scope.get_data = function () {
                // Make sure we have everything for the request to complete
                if (dashboard.indices.length === 0) {
                    return;
                }
                delete $scope.panel.error;
                $scope.panelMeta.loading = true;
                var request, results;

                $scope.panel.selectedSolrCollection = config[$scope.panel.selectedDataSource]; 
                $scope.sjs.client.server(dashboard.current.solr.server + $scope.panel.selectedSolrCollection);
                $scope.sjs.client.addExtraHeader($rootScope.token);

                request = $scope.sjs.Request().indices(dashboard.indices);
                $scope.panel.queries.ids = querySrv.idsByMode($scope.panel.queries);

                // Populate the inspector panel
                $scope.inspector = angular.toJson(JSON.parse(request.toString()), true);

                // Build Solr query
                var time_field = filterSrv.getTimeField();
                var start_time = filterSrv.getStartTime();
                var end_time = filterSrv.getEndTime();
                var fq = '';
                if (filterSrv.getSolrFq() != '') {
                    fq = '&' + filterSrv.getSolrFq();
                }
                fq = filterSrv.replaceSolrCollectionTimefieldByVendor($scope.panel.selectedSolrCollection, fq);

                fq += '&fq=!country_s:\"-\"';
                var wt_json = '&wt=json';
                var rows_limit = '&rows=0'; // for terms, we do not need the actual response doc, so set rows=0
                var panel_field = $scope.panel.field1 + "," + $scope.panel.field2;
                var facet = '&facet=true' +
                    '&facet.limit=' + $scope.panel.size +
                    '&facet.pivot=' + panel_field;

                // Set the panel's query
                $scope.panel.queries.query = querySrv.getORquery() + wt_json + rows_limit + fq + facet;
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
                    var k = 0;
                    var missing = 0;
                    $scope.panelMeta.loading = false;
                    $scope.hits = results.response.numFound;
                    $scope.data = [];
                    $scope.maxRatio = 0;
                    $scope.yaxis_min = 0;
                    var countryCodes = {};
                    countryCodes["AF"] = "Afghanistan";
                    countryCodes["AL"] = "Albania";
                    countryCodes["DZ"] = "Algeria";
                    countryCodes["AO"] = "Angola";
                    countryCodes["AQ"] = "Antarctica";
                    countryCodes["AR"] = "Argentina";
                    countryCodes["AM"] = "Armenia";
                    countryCodes["AU"] = "Australia";
                    countryCodes["AT"] = "Austria";
                    countryCodes["AZ"] = "Azerbaijan";
                    countryCodes["BS"] = "Bahamas";
                    countryCodes["BD"] = "Bangladesh";
                    countryCodes["BY"] = "Belarus";
                    countryCodes["BE"] = "Belgium";
                    countryCodes["BZ"] = "Belize";
                    countryCodes["BJ"] = "Benin";
                    countryCodes["BT"] = "Bhutan";
                    countryCodes["BO"] = "Bolivia";
                    countryCodes["BA"] = "Bosnia";
                    countryCodes["BW"] = "Botswana";
                    countryCodes["BR"] = "Brazil";
                    countryCodes["BN"] = "Brunei";
                    countryCodes["BG"] = "Bulgaria";
                    countryCodes["BF"] = "Burkina";
                    countryCodes["BI"] = "Burundi";
                    countryCodes["KH"] = "Cambodia";
                    countryCodes["CM"] = "Cameroon";
                    countryCodes["CA"] = "Canada";
                    countryCodes["TD"] = "Chad";
                    countryCodes["CL"] = "Chile";
                    countryCodes["CN"] = "China";
                    countryCodes["CO"] = "Colombia";
                    countryCodes["CG"] = "Congo";
                    countryCodes["HR"] = "Croatia";
                    countryCodes["CU"] = "Cuba";
                    countryCodes["CY"] = "Cyprus";
                    countryCodes["CZ"] = "Czech";
                    countryCodes["DK"] = "Denmark";
                    countryCodes["DJ"] = "Djibouti";
                    countryCodes["DO"] = "Dominican";
                    countryCodes["EC"] = "Ecuador";
                    countryCodes["EG"] = "Egypt";
                    countryCodes["ER"] = "Eritrea";
                    countryCodes["EE"] = "Estonia";
                    countryCodes["ET"] = "Ethiopia";
                    countryCodes["FJ"] = "Fiji";
                    countryCodes["FI"] = "Finland";
                    countryCodes["FR"] = "France";
                    countryCodes["GA"] = "Gabon";
                    countryCodes["GM"] = "Gambia";
                    countryCodes["GE"] = "Georgia";
                    countryCodes["DE"] = "Germany";
                    countryCodes["GH"] = "Ghana";
                    countryCodes["GR"] = "Greece";
                    countryCodes["GL"] = "Greenland";
                    countryCodes["GT"] = "Guatemala";
                    countryCodes["GN"] = "Guinea";
                    countryCodes["GW"] = "Guinea-Bissau";
                    countryCodes["GY"] = "Guyana";
                    countryCodes["HT"] = "Haiti";
                    countryCodes["HN"] = "Honduras";
                    countryCodes["HU"] = "Hungary";
                    countryCodes["IS"] = "Iceland";
                    countryCodes["IN"] = "India";
                    countryCodes["ID"] = "Indonesia";
                    countryCodes["IR"] = "Iran";
                    countryCodes["IQ"] = "Iraq";
                    countryCodes["IE"] = "Ireland";
                    countryCodes["IL"] = "Israel";
                    countryCodes["IT"] = "Italy";
                    countryCodes["JM"] = "Jamaica";
                    countryCodes["JP"] = "Japan";
                    countryCodes["JO"] = "Jordan";
                    countryCodes["KZ"] = "Kazakhstan";
                    countryCodes["KE"] = "Kenya";
                    countryCodes["KP"] = "Korea";
                    countryCodes["KW"] = "Kuwait";
                    countryCodes["KG"] = "Kyrgyzstan";
                    countryCodes["LV"] = "Latvia";
                    countryCodes["LB"] = "Lebanon";
                    countryCodes["LS"] = "Lesotho";
                    countryCodes["LR"] = "Liberia";
                    countryCodes["LY"] = "Libya";
                    countryCodes["LT"] = "Lithuania";
                    countryCodes["LU"] = "Luxembourg";
                    countryCodes["MK"] = "Macedonia";
                    countryCodes["MG"] = "Madagascar";
                    countryCodes["MW"] = "Malawi";
                    countryCodes["MY"] = "Malaysia";
                    countryCodes["ML"] = "Mali";
                    countryCodes["MR"] = "Mauritania";
                    countryCodes["MX"] = "Mexico";
                    countryCodes["MD"] = "Moldova";
                    countryCodes["MN"] = "Mongolia";
                    countryCodes["ME"] = "Montenegro";
                    countryCodes["MA"] = "Morocco";
                    countryCodes["MZ"] = "Mozambique";
                    countryCodes["MM"] = "Myanmar";
                    countryCodes["NA"] = "Namibia";
                    countryCodes["NP"] = "Nepal";
                    countryCodes["NL"] = "Netherlands";
                    countryCodes["NC"] = "New Caledonia";
                    countryCodes["NZ"] = "New Zealand";
                    countryCodes["NI"] = "Nicaragua";
                    countryCodes["NE"] = "Niger";
                    countryCodes["NG"] = "Nigeria";
                    countryCodes["NO"] = "Norway";
                    countryCodes["OM"] = "Oman";
                    countryCodes["PK"] = "Pakistan";
                    countryCodes["PA"] = "Panama";
                    countryCodes["PY"] = "Paraguay";
                    countryCodes["PE"] = "Peru";
                    countryCodes["PH"] = "Philippines";
                    countryCodes["PL"] = "Poland";
                    countryCodes["PT"] = "Portugal";
                    countryCodes["PR"] = "Puerto";
                    countryCodes["QA"] = "Qatar";
                    countryCodes["RO"] = "Romania";
                    countryCodes["RU"] = "Russia";
                    countryCodes["RW"] = "Rwanda";
                    countryCodes["SA"] = "Saudi Arabia";
                    countryCodes["SN"] = "Senegal";
                    countryCodes["RS"] = "Serbia";
                    countryCodes["SL"] = "Sierra";
                    countryCodes["SK"] = "Slovakia";
                    countryCodes["SI"] = "Slovenia";
                    countryCodes["SB"] = "Solomon";
                    countryCodes["SO"] = "Somalia";
                    countryCodes["ZA"] = "South Africa";
                    countryCodes["SS"] = "South Sudan";
                    countryCodes["ES"] = "Spain";
                    countryCodes["LK"] = "Sri Lanka";
                    countryCodes["SD"] = "Sudan";
                    countryCodes["SR"] = "Suriname";
                    countryCodes["SZ"] = "Swaziland";
                    countryCodes["SE"] = "Sweden";
                    countryCodes["CH"] = "Switzerland";
                    countryCodes["SG"] = "Singapore";
                    countryCodes["TW"] = "Taiwan";
                    countryCodes["TJ"] = "Tajikistan";
                    countryCodes["TZ"] = "Tanzania";
                    countryCodes["TH"] = "Thailand";
                    countryCodes["TL"] = "Timor-Leste";
                    countryCodes["TG"] = "Togo";
                    countryCodes["TT"] = "Trinidad";
                    countryCodes["TN"] = "Tunisia";
                    countryCodes["TR"] = "Turkey";
                    countryCodes["TM"] = "Turkmenistan";
                    countryCodes["UG"] = "Uganda";
                    countryCodes["UA"] = "Ukraine";
                    countryCodes["AE"] = "United Arab Emirates";
                    countryCodes["GB"] = "United Kingdom";
                    countryCodes["UY"] = "Uruguay";
                    countryCodes["UZ"] = "Uzbekistan";
                    countryCodes["VU"] = "Vanuatu";
                    countryCodes["VE"] = "Venezuela";
                    countryCodes["VN"] = "Vietnam";
                    countryCodes["YE"] = "Yemen";
                    countryCodes["ZM"] = "Zambia";
                    countryCodes["ZW"] = "Zimbabwe";
                    countryCodes["US"] = "USA";
                    var dtgFormat = d3.time.format("%Y-%m-%dT00:00:00Z");
                    //for test ,need the same data for each country
                    var dict = [];
                    var tmp = new Array();
                    _.each(results.facet_counts.facet_pivot, function (v) {
                        for (var i = 0; i < v.length; i++) {
                            var dt = v[i];
                            var block = [];
                            block["State"] = dt["value"];
                            var pivot = dt["pivot"];
                            var pt = [];
                            for (var j = 0; j < pivot.length; j++) {
                                var key = pivot[j]["value"];
                                pt[key] = pivot[j]["count"];
                                
                                // Short term fix for display estimated page view for WSI data
                                if ($scope.panel.selectedSolrCollection === "wsi_collection") {
                                    pt[key] = Math.round((pivot[j]["count"])/config.wsi_page_view_ratio);
                                }
                                if (dict[key] == null) {
                                    dict[key] = key;
                                }
                            }
                            block["pt"] = pt;
                            tmp.push(block);
                        }
                    });
                    for (var i = 0; i < tmp.length; i++) {
                        var bk = [];
                        var st = tmp[i]["State"];

                        if (countryCodes[st.toUpperCase()]) {
                            st = countryCodes[st.toUpperCase()];
                        }
                        bk["State"] = st;
                        var pt = tmp[i]["pt"];
                        for (var item_key in dict) {
                            var fg = 0;
                            var tmp_item_key = item_key;

                            for (var item  in pt) {
                                if (item == item_key) {
                                    bk[item_key] = pt[item];
                                    fg = 1;
                                    break;
                                }
                            }
                            if (fg == 0) {
                                bk[item_key] = 0;
                            }
                        }
                        $scope.data.push(bk);
                    }
                    if ($scope.data.length <= 0 ) $scope.panel.error = "No data returned."
                    $scope.$emit('render');
                });
            };

            $scope.build_search = function (word) {
                if (word) {
                    filterSrv.set({type: 'terms', field: $scope.panel.field, value: word, mandate: 'must'});
                } else {
                    return;
                }
                dashboard.refresh();
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
                    if ($scope.panel.field1.includes(",") || $scope.panel.field2.includes(",")) {
                        $scope.panel.error = "Error: Each input box can only contain 1 field name!";
                        $scope.refresh = false;
                        return true;
                    } else {
                        $scope.get_data();
                        $scope.$emit('render');
                    }
                }
            };
        });

        module.directive('comparisonsChart', function (querySrv, dashboard, filterSrv) {
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
                        element.html("");
                        var el = element[0];
                        var width = element.parent().width();
                        var rowheight = parseInt(scope.row.height);
                        var margin = {top: 40, right: 20, bottom: 100, left: 60};
                        width = width - margin.left - margin.right;
                        var height = (rowheight - margin.top - margin.bottom);
                        if (height < 300) height = 300;
                        var x0 = d3.scale.ordinal().rangeRoundBands([0, width], .1);

                        var x1 = d3.scale.ordinal();

                        var y = d3.scale.linear()
                            .range([height, 0]);

                        var color = d3.scale.ordinal()
                            .range(["#067BC2", "#D56062", "#62B6CB", "#F37748", "#ECC30B", "#055A8E", "#AF4F51", "#62B6CB", "#71CC61", "#4b0082", "#94447d", "#5DA750"]);

                        var xAxis = d3.svg.axis()
                            .scale(x0)
                            .orient("bottom");

                        var yAxis = d3.svg.axis()
                            .scale(y)
                            .orient("left")
                            .tickFormat(d3.format(".2s"));

                        var svg = d3.select(element[0]).append("svg")
                            .attr("width", width + margin.left + margin.right)
                            .attr("height", height + margin.top + margin.bottom)
                            .append("g")
                            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

                        var broadcastingServicesNames = {};
                        broadcastingServicesNames["vi"] = "VOA Persian";
                        broadcastingServicesNames["rf"] = "Radio Farda";
                        broadcastingServicesNames["vz"] = "VOA Chinese";
                        broadcastingServicesNames["vt"] = "VOA Tibetan";
                        broadcastingServicesNames["rz"] = "VOA Chinese";
                        broadcastingServicesNames["rc"] = "RFA Cantonese";
                        broadcastingServicesNames["ru"] = "RFA Uygher";
                        broadcastingServicesNames["vv"] = "VOA Vietnamese";
                        broadcastingServicesNames["rt"] = "RFA Tibetan";
                        broadcastingServicesNames["rv"] = "RFA Vietnamese";
                        broadcastingServicesNames["rb"] = "RFA Burmese";

                        var tip = d3tip()
                            .attr('class', 'd3-tip')
                            .offset([-10, 0])
                            .html(function (d) {
                                return "<strong>Hit:</strong> <span style='color:white'>" + d.value + "<br/>" + broadcastingServicesNames[d.name] + "</span>";
                            });

                        svg.call(tip);
                        var ageNames = [];
                        if (typeof scope.data === 'undefined' )  scope.data = [];
                        if (scope.data.length > 0 ) {

                           ageNames = d3.keys(scope.data[0]).filter(function (key) {
                               return key !== "State";
                           });

                           scope.data.forEach(function (d) {
                               d.ages = ageNames.map(function (name) {
                                   return {name: name, value: d[name]};
                               });
                           });
                        }
                        
                        x0.domain(scope.data.map(function (d) {
                            return d.State;
                        }));

                        x1.domain(ageNames).rangeRoundBands([0, x0.rangeBand()]);

                        y.domain([0, d3.max(scope.data, function (d) {
                            return d3.max(d.ages, function (d) {
                                return d.value;
                            });
                        })]);

                        svg.append("g")
                            .attr("class", "x axis")
                            .attr("transform", "translate(0," + height + ")")
                            .call(xAxis)
                            .selectAll("text")
                            .attr("y", 0)
                            .attr("x", -9)
                            .attr("dy", ".35em")
                            .attr("transform", "rotate(-45)")
                            .style("text-anchor", "end");

                        svg.append("g")
                            .append("text")
                            .attr("x", width / 2)
                            .attr("y", height + 95)
                            .attr("fill", "#000")
                            .text(scope.panel.field1.toLocaleString());

                        svg.append("g")
                            .attr("class", "y axis")
                            .call(yAxis)
                            .append("text")
                            .attr("transform", "rotate(-90)")
                            .attr("y", 6)
                            .attr("dy", ".71em")
                            .style("text-anchor", "end")
                            .text("Hit");

                        var state = svg.selectAll(".state")
                            .data(scope.data)
                            .enter().append("g")
                            .attr("class", "state")
                            .attr("transform", function (d) {
                                return "translate(" + x0(d.State) + ",0)";
                            });
                      if (scope.data.length > 0 ){
                        state.selectAll("rect")
                            .data(function (d) {
                                return d.ages;
                            })
                            .enter().append("rect")
                            .attr("width", x1.rangeBand())
                            .attr("x", function (d) {
                                return x1(d.name);
                            })
                            .attr("y", function (d) {
                                return y(d.value);
                            })
                            .attr("height", function (d) {
                                return height - y(d.value);
                            })
                            .style("fill", function (d) {
                                return color(d.name);
                            })
                            .on('mouseover', tip.show)
                            .on('mouseout', tip.hide)
                            .on('click', function (d) {
                                tip.hide();
                                scope.build_search(d.letter);
                            });
                        }
                        var legend = svg.selectAll(".legend")
                            .data(ageNames.slice().reverse())
                            .enter().append("g")
                            .attr("class", "legend")
                            .attr("transform", function (d, i) {
                                return "translate(0," + i * 20 + ")";
                            });

                        legend.append("rect")
                            .attr("x", width - 18)
                            .attr("width", 18)
                            .attr("height", 18)
                            .style("fill", color);

                        legend.append("text")
                            .attr("x", width - 24)
                            .attr("y", 9)
                            .attr("dy", ".35em")
                            .style("text-anchor", "end")
                            .text(function (d) {
                                return broadcastingServicesNames[d];
                            });
                            
                        svg.selectAll("path.domain")
                           .style("fill","none")
                           .style("stroke", "#000");

                        svg.selectAll(".tick line")
                           .style("fill","none")
                           .style("stroke", "#000");

                        svg.selectAll(".tick text")
                           .style("font-size", "12px");

                        legend.selectAll(".tick text")
                              .style("font-size", "14px");
                    }
                }
            };
        });
    });
