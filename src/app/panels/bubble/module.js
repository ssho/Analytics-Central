/*
  ## Bar module
  * For tutorial on how to create a custom Banana module.
*/
define([
  'angular',
  'config',
  'app',
  'underscore',
  'jquery',
  'd3'
],
function (angular, config, app, _, $, d3) {
  'use strict';

  var module = angular.module('kibana.panels.bubble', []);
  app.useModule(module);

  module.controller('bubble', function($scope, dashboard, querySrv, filterSrv,$rootScope) {
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
      status: '',
      description: ''
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
      fontScale:20,
      spyable: true,
      show_queries: true,
      selectedSolrCollection:"",
      //solrCollectionList:[],
      selectedDataSource:'',
      dataSourceList:[],
    };

    // Set panel's default values
    _.defaults($scope.panel, _d);

    if (typeof $scope.panel.selectedSolrCollection === "undefined") $scope.panel.selectedSolrCollection = "";
    if (typeof $scope.panel.solrCollectionList === "undefined") $scope.panel.solrCollectionList = [];
    $scope.panel.solrCollectionList = [];
    $scope.panel.dataSourceList = [];
    for (var item in $scope.userSolrCollection){
         $scope.panel.dataSourceList.push(config[$scope.userSolrCollection[item].collectionName]);
    };
    if ($scope.panel.selectedDataSource === ""){
        for (var item in $scope.userSolrCollection){
             if ($scope.userSolrCollection[item].isDefault == 1){
                  $scope.panel.selectedDataSource = config[$scope.userSolrCollection[item].collectionName];
             };
        };
    } ;


    $scope.init = function() {
      $scope.$on('refresh',function(){
        $scope.get_data();
      });
      $scope.get_data();
    };

    $scope.randomColor = function() {
       // Adapted from http://martin.ankerl.com/2009/12/09/how-to-create-random-colors-programmatically/
       var golden_ratio_conjugate = 0.618033988749895;
       var h = Math.random();

       var hslToRgb = function (h, s, l){
           var r, g, b;

           if(s == 0){
               r = g = b = l; // achromatic
           }else{
               function hue2rgb(p, q, t){
                   if(t < 0) t += 1;
                   if(t > 1) t -= 1;
                   if(t < 1/6) return p + (q - p) * 6 * t;
                   if(t < 1/2) return q;
                   if(t < 2/3) return p + (q - p) * (2/3 - t) * 6;
                   return p;
               }

               var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
               var p = 2 * l - q;
               r = hue2rgb(p, q, h + 1/3);
               g = hue2rgb(p, q, h);
               b = hue2rgb(p, q, h - 1/3);
           }

           return '#'+Math.round(r * 255).toString(16)+Math.round(g * 255).toString(16)+Math.round(b * 255).toString(16);
       };

       return function(){
         h += golden_ratio_conjugate;
         h %= 1;
         return hslToRgb(h, 0.5, 0.60);
       };
    };

    $scope.set_refresh = function(state) {
      $scope.refresh = state;
    };

    $scope.close_edit = function() {
      if ($scope.refresh) {
        $scope.get_data();
      }
      $scope.refresh = false;
      $scope.$emit('render');
    };

    $scope.render = function() {
      $scope.$emit('render');
    };

    $scope.get_data = function() {
      // Show the spinning wheel icon
      $scope.panelMeta.loading = true;

      // Set Solr server
      $scope.panel.selectedSolrCollection = config[$scope.panel.selectedDataSource];
      $scope.sjs.client.server(dashboard.current.solr.server + $scope.panel.selectedSolrCollection);
   
      //$scope.sjs.client.server(dashboard.current.solr.server + dashboard.current.solr.core_name);
      $scope.sjs.client.addExtraHeader($rootScope.token);
      var request = $scope.sjs.Request();

      // Construct Solr query
      var fq = '';
      if (filterSrv.getSolrFq()) {
          fq = '&' + filterSrv.getSolrFq();
      }
      
      fq = filterSrv.replaceSolrCollectionTimefieldByVendor($scope.panel.selectedSolrCollection,fq);

      var wt = '&wt=json';
      var fl = '&fl=' + $scope.panel.field;
      var rows_limit = '&facet.limit=' + $scope.panel.max_rows;

      //$scope.panel.queries.query = querySrv.getQuery(0) + fq + fl + wt + rows_limit;
      //$scope.panel.queries.query = querySrv.getQuery(0) + fq + wt
      //    + rows_limit + '&indent=true&facet=true&facet.field=' + $scope.panel.field;

      var mapQuery = '';
      var start_time = filterSrv.getStartTime();
      var end_time = filterSrv.getEndTime();
      if (end_time == '*'){end_time ='NOW'};

      if ($scope.panel.selectedSolrCollection === "wsi_collection"){mapQuery = config.term_page_query;};
      if ($scope.panel.selectedSolrCollection === "ultrareach_collection"){mapQuery = config.ultrareach_q_for_visit + config.term_page_query;};
      if ($scope.panel.selectedSolrCollection === "psiphon_collection"){mapQuery = config.psiphon_q_for_visit + config.term_page_query;};
      mapQuery = mapQuery.replace("_startdate_",start_time);
      mapQuery = mapQuery.replace("_enddate_",end_time);
      mapQuery = mapQuery.replace("_panelfield_",$scope.panel.field);
      mapQuery = mapQuery.replace("_limit_",$scope.panel.max_rows);
      //console.log($scope.panel.selectedSolrCollection);
      //console.log("config map query " + config.map_query);
      //console.log("map query "+ mapQuery );
      $scope.panel.queries.query = querySrv.getQuery(0) + mapQuery;



      // Set the additional custom query
      if ($scope.panel.queries.custom != null) {
          request = request.setQuery($scope.panel.queries.query + $scope.panel.queries.custom);
      } else {
          request = request.setQuery($scope.panel.queries.query);
      }
      //alert(dashboard.current.solr.server + dashboard.current.solr.core_name);
      //alert('------'+$scope.panel.queries.query);
      // Execute the search and get results
      var results = request.doSearch();

      // Populate scope when we have results
      results.then(function(results) {
        $scope.data = {};
        //var parsedResults = d3.csv.parse(results, function(d) {
        //  d[$scope.panel.field] = +d[$scope.panel.field]; // coerce to number
        //  return d;
        //});

        //$scope.data = _.pluck(parsedResults,$scope.panel.field);l

        //$scope.data = results.facet_counts.facet_fields._text_;
        try{
          //$scope.data = eval('results.facet_counts.facet_fields.' + $scope.panel.field) ;
          $scope.data = results.facets.total_visit.buckets;
        }
        catch(error){
          //console.log("no data returned");
          $scope.panel.error = "no data returned";
        };


        $scope.render();
      });

      // Hide the spinning wheel icon
      $scope.panelMeta.loading = false;
    };
  });



  module.directive('bubbleChart', function(querySrv, dashboard, filterSrv) {
    return {
      restrict: 'E',
      link: function(scope, element) {
        var parent_width = element.parent().width();
        var links = null;
        var word1 = "";
        var word2 = "";
        var circle_min = 5, circle_max = 75;
        var data_min = 0, data_max = 0;
        var width = 960, height = 500;
        var force = null;
        var svg = null;
        var circle = null;
        var text = null;
        scope.$on('render',function(){
          render_panel();
        });

        // Render the panel when resizing browser window
        angular.element(window).bind('resize', function() {
          render_panel();
        });

        // Function for rendering panel
        function render_panel() {
          // Clear the panel
          element.html('');
          width = element.parent().width();
          height = parseInt(scope.row.height);
          if (height < 400 ) height = 400;
          //var parent_width = element.parent().width();
          //var height = 500; //parseInt(scope.row.height+1500);
          //var width = parent_width - 20;


          //links = [
          //{ text: "Microsoft", "size": 50 },
          //{ text: "Apple", "size": 50 },
          //{ text: "Kodak", "size": 15 },
          //{ text: "Nokia", "size": 15 }
          //];
          //var data = eval('results.facet_counts.facet_pivot.' + $scope.panel.field);
          //console.log("333"+JSON.stringify(scope.data));
          var returnedData = scope.data ;
          links = [];
          //for (var i = 0; i < returnedData.length -1 ; i+=2) {
          //  links.push({"text":returnedData[i],"size":returnedData[i+1]});
          //};
          
          for (var i = 0; i < returnedData.length  ; i++) {
            links.push({"text":returnedData[i].val,"size":returnedData[i].total});
          };

          //d3.select(element[0]).remove();
          cal_data_min_max();
          force = d3.layout.force().nodes(d3.values(links))
            //.links(links)
            .size([ width, height ])
            //.linkDistance(60)
            .charge(-200).on("tick", tick).start();
            //svg = d3.select("body").append("svg")
          svg = d3.select(element[0]).append("svg").attr("width", width)
              .attr("height", height);
            // Per-type markers, as they don't inherit styles.
          svg.append("defs").selectAll("marker").data(
              [ "suit", "licensing", "resolved" ]).enter().append(
              "marker").attr("id", function(d) {
            return d;
            }).attr("viewBox", "0 -5 10 10").attr("refX", 15)
              .attr("refY", -1.5).attr("markerWidth", 6).attr(
                  "markerHeight", 6).attr("orient", "auto")
              //.append("path")

              .attr("d", "M0,-5L10,0L0,5");

          circle = svg
              .append("g")
              .selectAll("circle")
              .data(force.nodes())
              .enter()
              .append("circle")
              .style("fill", scope.randomColor())
              .style("stroke-width", "1px")
              .attr('opacity', 0.5)
              .attr(
                  "r",
                  function(d) {
                    var calculatedResult = (((d.size - data_min) / (data_max - data_min)) * (circle_max - circle_min))
                        + circle_min;
                    if (!calculatedResult) calculatedResult = circle_min;       //avoid NaN
                    return calculatedResult;
                  }).call(force.drag);

          text = svg.append("g").selectAll("text").data(force.nodes())
              .enter().append("text").attr("y", 0).attr("text-anchor",
                  "middle")
              .style("font-size",scope.panel.fontScale+"px")
              .text(function(d) {
                return d.text;
              });
        }
        function tick() {
        			//path.attr("d", linkArc);
        			circle.attr("transform", transform);
        			text.attr("transform", transform);
        };

        function transform(d) {
        			return "translate(" + d.x + "," + d.y + ")";
        };

        function cal_data_min_max() {
        			for (var i = 0; i < links.length; i++) {
        				if (i == 0) {
        					data_min = links[i].size;
        					data_max = links[i].size;
        				} else {
        					if (data_min > links[i].size)
        						data_min = links[i].size;
        					if (data_max < links[i].size)
        						data_max = links[i].size;
        				}
        			}
        };


    },
  };
});

});
