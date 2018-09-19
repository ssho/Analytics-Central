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
    function (angular,config, app, _, $, kbn, d3, d3tip) {
        'use strict';

        var module = angular.module('kibana.panels.country', []);
        app.useModule(module);

        module.controller('country', function ($scope, querySrv, dashboard, filterSrv, $rootScope) {
            $scope.panelMeta = {
                modals: [{
                    description: "Information",
                    icon: "icon-info-sign",
                    partial: "app/partials/inspector.html",
                    show: $scope.panel.spyable
                }],
                editorTabs: [{
                    title: 'Queries',
                    src: 'app/partials/querySelect.html'
                }],
                exportfiletocsv : true,
                status: "Experimental",
                description: "Display the D3 Bar Chart with Tooltip."
            };

            // Set and populate defaults
            var _d = {
                queries: {
                    mode: 'all',
                    query: '*:*',
                    custom: ''
                },
                field: 'source_country_code',
                size: 10,
                max_rows: 20,
                spyable: true,
                show_queries: true,
                error: '',
                selectedSolrCollection:"",
                //solrCollectionList:[],
                info_description: 'A bar chart to show top 10 countries with most visit.',
                dataSourceList:[],
                selectedDataType:{} ,
                selectedDataSource: {name: ''},
            };
            _.defaults($scope.panel, _d);
            
            $scope.panel.solrCollectionList = [];
            $scope.panel.dataSourceList = [];
            for (var item in $scope.userSolrCollection){
                   $scope.panel.dataSourceList.push(config[$scope.userSolrCollection[item].collectionName]);
            };
            if ($scope.panel.selectedDataSource.name === ""){
                  for (var item in $scope.userSolrCollection){
                       if ($scope.userSolrCollection[item].isDefault == 1){
                           $scope.panel.selectedDataSource.name = config[$scope.userSolrCollection[item].collectionName];
                       };
                  };
            };
            
            
            if ($scope.panel.field === '' || typeof $scope.panel.field === 'undefined') {
                $scope.panel.field = 'country_s';
            }

            $scope.exportfiletocsv = function() {
                console.log($scope.data);
                var tempdata = $scope.data;
                var response = "Location,Value\n";
                for (var item in tempdata) {
                    //console.log(tempdata[item].letter + "," + tempdata[item].frequency );
                    response += tempdata[item].letter + "," + tempdata[item].frequency + "\n";
                }
                var basename = $scope.panel.title + "-" + $scope.panel.selectedDataSource.name + "-" + $scope.panel.selectedDataType;
                kbn.download_response_to_csv(response,basename);
            }
            $scope.init = function () {
                console.log("inside country ");
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
                if (dashboard.indices.length === 0) {
                    return;
                }
                delete $scope.panel.error;
                $scope.panelMeta.loading = true;
                var request, results;
               $scope.panel.selectedSolrCollection = config[$scope.panel.selectedDataSource.name];
               $scope.sjs.client.server(dashboard.current.solr.server + $scope.panel.selectedSolrCollection);
               $scope.sjs.client.addExtraHeader($rootScope.token);
               // $scope.sjs.client.server(dashboard.current.solr.server + dashboard.current.solr.core_name);

                request = $scope.sjs.Request().indices(dashboard.indices);
                $scope.panel.queries.ids = querySrv.idsByMode($scope.panel.queries);

                // Populate the inspector panel
                $scope.inspector = angular.toJson(JSON.parse(request.toString()), true);
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
                    var k = 0;
                    var missing = 0;
                    $scope.panelMeta.loading = false;
                    $scope.hits = results.response.numFound;
                    $scope.data = [];
                    $scope.maxRatio = 0;

                    $scope.yaxis_min = 0;
                    //console.log(results.facet_counts.facet_fields);
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
                    countryCodes["NC"] = "NewCaledonia";
                    countryCodes["NZ"] = "NewZealand";
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
                    countryCodes["SA"] = "SaudiArabia";
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
                    countryCodes["SG"] = "Singapore";
                    countryCodes["CH"] = "Switzerland";
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

                    var returnedData = [];
                    try {
                      returnedData = results.facets.total.buckets;
                    } catch (err) {
                      returnedData = [];
                    };
                    if (typeof returnedData === "undefined") returnedData = [];
                    //console.log("returnedData "+JSON.stringify(returnedData));
                    for (var index in returnedData){
                       var term = returnedData[index].val;
                       var count = returnedData[index].daily_sum;

                       if (typeof count === "undefined") {
                         count = 0 ;
                       } else if ($scope.panel.selectedSolrCollection === "wsi_collection" && $scope.panel.selectedDataType === 'Page view') {
                           count = Math.round(count * config.wsi_page_view_ratio);
                       }

                       //if (typeof count === "undefined") count = 0 ;
                       if (term === null) {
                           missing = count;
                       } else {
                           // if count = 0, do not add it to the chart, just skip it
                           if (count === 0) {
                               continue;
                           }
                           var new_country = term;
                           //console.log(countryCodes);
                           if (countryCodes[term.toUpperCase()]) {
                               new_country = countryCodes[term.toUpperCase()];
                               //console.log(new_country);
                           }
                           var slice = {
                               letter: new_country,
                               frequency: count
                           };
                           if (count / $scope.hits > $scope.maxRatio) {
                               $scope.maxRatio = count / $scope.hits;
                           }
                           $scope.data.push(slice);
                       }
                    };
                    /*
                    _.each(results.facet_counts.facet_fields, function (v) {
                        for (var i = 0; i < v.length; i++) {
                            var term = v[i];
                            i++;
                            var count = v[i];
                            sum += count;
                            if (term === null) {
                                missing = count;
                            } else {
                                // if count = 0, do not add it to the chart, just skip it
                                if (count === 0) {
                                    continue;
                                }
                                var new_country = term;
                                //console.log(countryCodes);
                                if (countryCodes[term.toUpperCase()]) {
                                    new_country = countryCodes[term.toUpperCase()];
                                    //console.log(new_country);
                                }
                                var slice = {
                                    letter: new_country,
                                    frequency: count
                                };
                                if (count / $scope.hits > $scope.maxRatio) {
                                    $scope.maxRatio = count / $scope.hits;
                                }
                                $scope.data.push(slice);
                            }
                        }
                    });
                    */
                    if ($scope.data.length <= 0 ) $scope.panel.error = "No data returned.";
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
                    $scope.get_data();
                }
                $scope.refresh = false;
                $scope.$emit('render');
            };
        });

        module.directive('countryChart', function (querySrv, dashboard, filterSrv) {
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
                        var height = parseInt(scope.row.height) ;
                         if (height < 350) height = 350;
                        // console.log("height:"+height);
                        var margin = {top: 40, right: 20, bottom: 100, left: 60};
                        width = width - margin.left - margin.right;
                        height = height - margin.top - margin.bottom;

                        var formatPercent = d3.format(".0s");
                        var x = d3.scale.ordinal()
                            .rangeRoundBands([0, width], .1, 1);

                        var y = d3.scale.linear()
                            .range([height, 0]);

                        var xAxis = d3.svg.axis()
                            .scale(x)
                            .orient("bottom");

                        var yAxis = d3.svg.axis()
                            .scale(y)
                            .orient("left")
                            //.tickFormat(formatPercent);
                            .tickFormat(function(d) {
                                  var d_string = d;
                                  if (d >= 1000 && d < 1000000) d_string = (d/1000) + "k";
                                  if (d >= 1000000 && d < 1000000000) d_string = (d / 1000000 ) + "M";
                                  if (d >= 1000000000) d_string = (d / 1000000000 ) + "B";
                                  return d_string});


                        var svg = d3.select(element[0]).append("svg")
                            .attr("width", width + margin.left + margin.right)
                            .attr("height", height + margin.top + margin.bottom)
                            .append("g")
                            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
                        var tip = d3tip()
                            .attr('class', 'd3-tip')
                            .offset([-10, 0])
                            .html(function (d) {
                                return "<strong>Hits:</strong> <span style='color:white'>" + d.frequency + "</span>";
                            });

                        svg.call(tip);
                        x.domain(scope.data.map(function (d) {
                            return d.letter;
                        })).rangeBands([margin.left, width - margin.right], 0.5);
                        y.domain([0, d3.max(scope.data, function (d) {
                            //console.log(d.letter);
                            //console.log(d.frequency);
                            return d.frequency;
                        })]).range([height, 0]);
/*
                       svg.append("g")
                            .append("text")
                            .attr("class","message")
                            .attr("x",-margin.left)
                            .attr("y",-30)
                            .attr("fill",config.themeTextFillColor)
                            .text("Data source: " + eval('config.' + scope.panel.selectedSolrCollection ));
*/
                        svg.append("g")
                            .attr("class", "country x axis")
                            .attr("transform", "translate(-60," + height + ")")                          
                            .call(xAxis)
                            .selectAll("text")
                             .attr("transform", "rotate(-45)")
                             .attr("y", 0)
                             .attr("x", -9)
                             .attr("dy", ".35em")
                             .style("text-anchor", "end");


                        svg.append("g")
                            .append("text")
                            .attr("x", width / 2)
                            .attr("y", height + 95)
                            .text(scope.panel.field);


                        svg.append("g")
                            .attr("class", "y axis")                           
                            .call(yAxis)
                            .append("text")
                            .attr("transform", "rotate(-90)")
                            .attr("x",-10)
                            .attr("y", 6)
                            .attr("dy", ".71em")
                            .style("text-anchor", "end")
                            .text(function () {
                                if (scope.panel.selectedDataType === "Traffic volume") {
                                    return "Data volume (Bytes)";
                                }
                                else {
                                    return scope.panel.selectedDataType;
                                }
                            });

                        svg.selectAll("path.domain")
                           .style("fill","none")
                           .style("stroke", "#000");

                        svg.selectAll(".tick line")
                           .style("fill","none")
                           .style("stroke", "#000");

                        svg.selectAll(".tick text")
                           .style("color","#000")
                           .style("font-size", "12px");


                        var grid = svg.selectAll(".bar")
                            .data(scope.data)
                            .enter().append("rect")
                            //.attr("class", "d3bar")
                            .style("fill","#067BC2")
                            .attr("x", function (d) {
                                return x(d.letter) - 60;
                            })
                            .attr("width", x.rangeBand())
                            .attr("y", function (d) {
                                return y(d.frequency);
                            })
                            .attr("height", function (d) {
                                return height - y(d.frequency);
                            })
                            .on('mouseover', function(d){ tip.show(d); d3.select(this).style('fill','#F37748'); })
                            .on('mouseout', function(d){ tip.hide(d); d3.select(this).style('fill','#067BC2'); }) 
                            .on('click', function (d) {
                                tip.hide();
                                scope.build_search(d.letter);
                            });

                            /*.on('mouseover', tip.show)
                            .on('mouseout', tip.hide)
                            .on('click', function (d) {
                                tip.hide();
                                scope.build_search(d.letter);
                            });*/
                    }
                }
            };
        });
    });
