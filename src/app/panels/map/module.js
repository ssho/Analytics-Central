/*
  ## Map

  ### Parameters
  * map :: 'world', 'world-antarctica', 'us' or 'europe'
  * colors :: an array of colors to use for the regions of the map. If this is a 2
              element array, jquerymap will generate shades between these colors
  * size :: How big to make the facet. Higher = more countries
  * exclude :: Exlude the array of counties
  * spyable :: Show the 'eye' icon that reveals the last Solr query
  * index_limit :: This does nothing yet. Eventually will limit the query to the first
                   N indices
*/

define([
  'angular',
  'config',
  'app',
  'underscore',
  'kbn',
  'jquery',
  './lib/map.world.codes',
  './lib/jquery.jvectormap.min'
],
function (angular, config, app, _,kbn, $, worldmap) {
  'use strict';

  var module = angular.module('kibana.panels.map', []);
  app.useModule(module);

  module.controller('map', function($scope, $rootScope, querySrv, dashboard, filterSrv) {
    $scope.panelMeta = {
      //editorTabs : [
      //  {title:'Queries', src:'app/partials/querySelect.html'}
      //],
      modals : [
        {
          description: "Information",
          icon: "icon-info-sign",
          partial: "app/partials/inspector.html",
          show: $scope.panel.spyable
        }
      ],
      exportfiletocsv:true,
      status  : "",
      description : "Displays a map of shaded regions using a field containing a 2 letter country code or US state code. Regions with more hits are shaded darker. It uses Solr faceting, so it is important that you set field values to the appropriate 2-letter codes at index time. Recent additions provide the ability to compute mean/max/min/sum of a numeric field by country or state."
    };

    // Set and populate defaults
    var _d = {
      queries     : {
        mode        : 'all',
        ids         : [],
        query       : '*:*',
        custom      : ''
      },
      mode  : 'count', // mode to tell which number will be used to plot the chart.
      field : '', // field to be used for rendering the map.
      stats_field : '',
      decimal_points : 0, // The number of digits after the decimal point
      map     : "world",
      useNames	: false,
      colors  : ['#A0E2E2', '#265656'],
      size    : 100,
      exclude : [],
      spyable : true,
      index_limit : 0,
      show_queries:true,
      selectedSolrCollection:"",
      //solrCollectionList:[],
      dataSourceList:[],
      selectedDataType:{} ,
      selectedDataSource: {name: ''},
    };
    _.defaults($scope.panel,_d);

    if (typeof $scope.panel.selectedSolrCollection === "undefined") $scope.panel.selectedSolrCollection = "";
    if (typeof $scope.panel.solrCollectionList === "undefined") $scope.panel.solrCollectionList = [];
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
    } ;
    $scope.exportfiletocsv = function() {
      console.log($scope.data);
        var tempdata = $scope.data;
        var response = "Location,Value\n";
        //var xxx = _.invert(worldmap.countryCodes);
        //console.log(countryCodes);
        if (tempdata != "undefined") {
            var allKeys = Object.keys(tempdata);
            for (var item of allKeys) {
                        console.log(tempdata[item] + "," + (_.invert(countryCodes))[item]);
                        //response = response + (_.invert(countryCodes))[item] + "," + tempdata[item] + "\n";
                        response = response + item + "," + tempdata[item] + "\n";
                    }
            }
            //var response = $scope.data;//"date,name\n12-12-2018,tom";
            var basename = $scope.panel.title;
            //console.log(JSON.stringify($scope.data[0].data));
               

            //response.then(function(response) {
            kbn.download_response_to_csv(response,basename);
            //});
    };  

    $scope.init = function() {
      // $scope.testMultivalued();
      $scope.$on('refresh',function(){$scope.get_data();});
      $scope.get_data();
    };

    $scope.testMultivalued = function() {
      if($scope.panel.field && $scope.fields.typeList[$scope.panel.field].schema.indexOf("M") > -1) {
        $scope.panel.error = "Can't proceed with Multivalued field";
        return;
      }
      if($scope.panel.stats_field && $scope.fields.typeList[$scope.panel.stats_field].schema.indexOf("M") > -1) {
        $scope.panel.error = "Can't proceed with Multivalued field";
        return;
      }
    };

    $scope.set_refresh = function (state) {
      $scope.refresh = state;
      // if 'count' mode is selected, set decimal_points to zero automatically.
      if ($scope.panel.mode === 'count') {
        $scope.panel.decimal_points = 0;
      }
    };

    $scope.close_edit = function() {
      if ($scope.refresh) {
        // $scope.testMultivalued();
        $scope.get_data();
      }
      $scope.refresh = false;
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
      fq = fq.replace("_panelfield_", 'source_country_code');
      fq = fq.replace("_limit_", $scope.panel.size);

      //console.log('querystring:' + fq);
      return fq;
    };

    $scope.get_data = function() {
      // Make sure we have everything for the request to complete
      if(dashboard.indices.length === 0) {
        return;
      }
      $scope.panelMeta.loading = true;
      delete $scope.panel.error;

      // Solr
      $scope.panel.selectedSolrCollection = config[$scope.panel.selectedDataSource.name];
      $scope.sjs.client.server(dashboard.current.solr.server + $scope.panel.selectedSolrCollection);
      //$scope.sjs.client.server(dashboard.current.solr.server + dashboard.current.solr.core_name);
      $scope.sjs.client.addExtraHeader($rootScope.token);
      var request;
      request = $scope.sjs.Request().indices(dashboard.indices);

      $scope.panel.queries.ids = querySrv.idsByMode($scope.panel.queries);
      // This could probably be changed to a BoolFilter
      var boolQuery = $scope.ejs.BoolQuery();
      _.each($scope.panel.queries.ids,function(id) {
        boolQuery = boolQuery.should(querySrv.getEjsObj(id));
      });

      // Then the insert into facet and make the request
      request = request
        .facet($scope.ejs.TermsFacet('map')
          .field($scope.panel.field)
          .size($scope.panel.size)
          .exclude($scope.panel.exclude)
          .facetFilter($scope.ejs.QueryFilter(
            $scope.ejs.FilteredQuery(
              boolQuery,
              filterSrv.getBoolFilter(filterSrv.ids)
              )))).size(0);

      $scope.populate_modal(request);

      // Build Solr query
   /*   var fq = '';
      if (filterSrv.getSolrFq()) {
        fq = '&' + filterSrv.getSolrFq();
      };
      fq = filterSrv.replaceSolrCollectionTimefieldByVendor($scope.panel.selectedSolrCollection,fq);
   
      var wt_json = '&wt=json';
      var rows_limit = '&rows=0'; // for map module, we don't display results from row, but we use facets.
      var facet = '';

      if ($scope.panel.mode === 'count') {
        facet = '&facet=true&facet.field=' + $scope.panel.field + '&facet.limit=' + $scope.panel.size;
      } else {
        // if mode != 'count' then we need to use stats query
        facet = '&stats=true&stats.facet=' + $scope.panel.field + '&stats.field=' + $scope.panel.stats_field;
      }

      // Set the panel's query
      //$scope.panel.queries.query = querySrv.getORquery() + wt_json + fq + rows_limit + facet;

      var mapQuery = '';
      var start_time = filterSrv.getStartTime();
      var end_time = filterSrv.getEndTime();
      if (end_time == '*'){end_time ='NOW'};

      if ($scope.panel.selectedSolrCollection === "wsi_collection"){mapQuery = config.term_page_query;};
      if ($scope.panel.selectedSolrCollection === "ultrareach_collection"){mapQuery = config.ultrareach_q_for_visit + config.term_page_query;};
      if ($scope.panel.selectedSolrCollection === "psiphon_collection"){mapQuery = config.psiphon_q_for_visit + config.term_page_query;};
      mapQuery = mapQuery.replace("_startdate_",start_time);
      mapQuery = mapQuery.replace("_enddate_",end_time);
      mapQuery = mapQuery.replace("_panelfield_",'source_country_code');
      mapQuery = mapQuery.replace("_limit_",'300');
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

      var results = request.doSearch();

      // Populate scope when we have results
      results.then(function(results) {
        $scope.panelMeta.loading = false;
        // Check for error and abort if found
        if(!(_.isUndefined(results.error))) {
          $scope.panel.error = $scope.parse_error(results.error.msg);
          return;
        }
        $scope.data = {}; // empty the data for new results
        var terms = [];

        if (results.response.numFound) {
          $scope.hits = results.response.numFound;
        } else {
          // Undefined numFound or zero, clear the map.
          $scope.$emit('render');
          return false;
        }

        if ($scope.panel.mode === 'count') {
          //terms = results.facet_counts.facet_fields[$scope.panel.field];
          terms = results.facets.total.buckets;
        } else { // stats mode
          _.each(results.stats.stats_fields[$scope.panel.stats_field].facets[$scope.panel.field], function(stats_obj,facet_field) {
            terms.push(facet_field, stats_obj[$scope.panel.mode]);
          });
        }

        if ($scope.hits > 0) {
         for (var index = 0 ; index < terms.length; index++){
             var tempdaily_sum = terms[index].daily_sum;

           if (typeof tempdaily_sum === "undefined") {
             tempdaily_sum = 0 ;
           } else if ($scope.panel.selectedSolrCollection === "wsi_collection" && $scope.panel.selectedDataType === 'Page view') {
             tempdaily_sum = Math.round(tempdaily_sum * config.wsi_page_view_ratio);
           }

             if(($scope.panel.map === 'world' || $scope.panel.map === 'world-antarctica') && $scope.panel.useNames) {
                if(worldmap.countryCodes[terms[index].val]) {
                   if (!$scope.data[worldmap.countryCodes[terms[index].val]]) {
                       $scope.data[worldmap.countryCodes[terms[index].val]] = tempdaily_sum;
                   } else {
                       $scope.data[worldmap.countryCodes[terms[index].val]] += tempdaily_sum;
                   }
              	}
             } else {
                  if (!$scope.data[terms[index].val.toUpperCase()]) {
                    $scope.data[terms[index].val.toUpperCase()] = tempdaily_sum;
                  } else {
                    $scope.data[terms[index].val.toUpperCase()] += tempdaily_sum;
                  }
             };
          };        
        
          /*      
          for (var i=0; i < terms.length; i += 2) {
            // Skip states with zero count to make them greyed out in the map.
            if (terms[i+1] > 0) {
              // if $scope.data[terms] is undefined, assign the value to it
              // otherwise, we will add the value. This case can happen when
              // the data contains both uppercase and lowercase state letters with
              // duplicate states (e.g. CA and ca). By adding the value, the map will
              // show correct counts for states with mixed-case letters.
              if(($scope.panel.map === 'world' || $scope.panel.map === 'world-antarctica') && $scope.panel.useNames) {
                if(worldmap.countryCodes[terms[i]]) {
                  if (!$scope.data[worldmap.countryCodes[terms[i]]]) {
                    $scope.data[worldmap.countryCodes[terms[i]]] = terms[i+1];
                  } else {
                    $scope.data[worldmap.countryCodes[terms[i]]] += terms[i+1];
                  }
              	}
              }
              else {
                  if (!$scope.data[terms[i].toUpperCase()]) {
                    $scope.data[terms[i].toUpperCase()] = terms[i+1];
                  } else {
                    $scope.data[terms[i].toUpperCase()] += terms[i+1];
                  }
              }
            }
          }
          */
        }

        $scope.$emit('render');
      });
    };

    // I really don't like this function, too much dom manip. Break out into directive?
    $scope.populate_modal = function(request) {
      $scope.inspector = angular.toJson(JSON.parse(request.toString()),true);
    };

    $scope.build_search = function(field,value) {
      // Set querystring to both uppercase and lowercase state values with double-quote around the value
      // to prevent query error from state=OR (Oregon).
      // When using Country Name option, the country name is supposed to be in capitalized format. But we
      // will also add queries for searching both uppercase and lowercase (e.g. Thailand OR THAILAND OR thailand).
      if (!$scope.panel.useNames) {
        filterSrv.set({type:'querystring',mandate:'must',query:field+':"'+value.toUpperCase()+
          '" OR '+field+':"'+value.toLowerCase()+'"'});
      } else {
        filterSrv.set({type:'querystring',mandate:'must',query:field+':"'+value.toUpperCase()+
          '" OR '+field+':"'+value.toLowerCase()+'" OR '+field+':"'+value+'"'});
      }
      
      dashboard.refresh();
    };

  });

  module.directive('map', function() {
    return {
      restrict: 'A',
      link: function(scope, elem) {
        elem.html('');
        elem.html('<center><img src="img/load_big.gif"></center>');

        // Receive render events
        scope.$on('render',function(){
          render_panel();
        });

        angular.element(window).bind('resize',function() {
          render_panel();
        }); 

        function render_panel() {
          elem.text('');
          //elem.html('');
          //elem.html('<center><img src="img/load_big.gif"></center>');
          $('.jvectormap-zoomin,.jvectormap-zoomout,.jvectormap-label').remove();
          require(['./panels/map/lib/map.'+scope.panel.map], function () {
            elem.vectorMap({
              map: scope.panel.map,
              regionStyle: {initial: {fill: '#8c8c8c'}},
              zoomOnScroll: false,
              backgroundColor: null,
              series: {
                regions: [{
                  values: scope.data,
                  scale: scope.panel.colors,
                  normalizeFunction: 'polynomial'
                }]
              },
              onRegionLabelShow: function(event, label, code){
                elem.children('.map-legend').show();
                var count = _.isUndefined(scope.data[code]) ? 0 : scope.data[code];
                // if (scope.panel.mode === 'count') {
                //   count = count.toFixed(0);
                // } else {
                //   count = count.toFixed(scope.panel.decimal_points);
                // }
                elem.children('.map-legend').text(label.text() + ": " + count.toFixed(scope.panel.decimal_points));
              },
              onRegionOut: function() {
                $('.map-legend').hide();
              },
              onRegionClick: function(event, code) {
                var count = _.isUndefined(scope.data[code]) ? 0 : scope.data[code];
                if (count !== 0) {
                  if (!scope.panel.useNames) {
                    scope.build_search(scope.panel.field, code);
                  } else {
                    var countryNames = _.invert(worldmap.countryCodes);
                    scope.build_search(scope.panel.field, countryNames[code]);
                  }
                }
              }
            });
            elem.prepend('<span class="map-legend"></span>');
            $('.map-legend').hide();
          });
        }
      }
    };
  });
});
