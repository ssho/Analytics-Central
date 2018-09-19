/*
  ## Bar module
  * For tutorial on how to create a custom Banana module.
*/
define([
  'angular',
  'app',
  'underscore',
  'config',
  'jquery',
  'd3'
],
function (angular, app, _, config, $, d3) {
  'use strict';

  var module = angular.module('kibana.panels.relationship', []);
  app.useModule(module);

  module.controller('relationship', function($scope, dashboard, querySrv, filterSrv,$rootScope) {
    $scope.panelMeta = {
      modals: [
        {
          description: 'Information',
          icon: 'icon-info-sign',
          partial: 'app/partials/inspector.html',
          show: $scope.panel.spyable
        }
      ],
      editorTabs: [
        {
          title: 'Queries',
          src: 'app/partials/querySelect.html'
        }
      ],
      status: 'Experimental',
      description: 'Bar module for tutorial'
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
      spyable: true,
      show_queries: true
    };

    // Set panel's default values
    _.defaults($scope.panel, _d);

    $scope.init = function() {
      $scope.$on('refresh',function(){
        $scope.get_data();
      });
      $scope.get_data();
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
      //alert("inside relationship 1");
      $scope.panelMeta.loading = true;

      // Set Solr server
      $scope.sjs.client.server(dashboard.current.solr.server + dashboard.current.solr.core_name + config.getRelationshipURL);
      $scope.sjs.client.addExtraHeader($rootScope.token);
      var request = $scope.sjs.Request();

      // Construct Solr query
      var fq = '';
      if (filterSrv.getSolrFq()) {
          fq = '&' + filterSrv.getSolrFq();
      }
      //fq = fq.replace('fq=','fq=_text_:');
//http://dnode01.bigdata.wasoftware.com:8983/solr/test_recursiveCount/recursiveCount?q=text_txt:cuba&facet.field=text_txt&facet=on&indent=on&wt=json&rows=5&facet.limit=5&facet.mincount=1
      var wt = '&wt=json';
      if ($scope.panel.field == null || typeof $scope.panel.field == "undefined") {$scope.panel.field = "keyword"}
      var fl = '&fl=' + $scope.panel.field;
      var rows_limit = '&rows=5';// + $scope.panel.max_rows;
      //var facet_limit = '&facet.limit=7&facet.mincount=1';
      if (typeof $scope.panel.facet_limit  == "undefined") {$scope.panel.facet_limit = 7}
      if (typeof $scope.panel.min_count == "undefined") {$scope.panel.min_count = 1}
      var facet_limit = '&facet.limit=' + $scope.panel.facet_limit + '&facet.mincount=' + $scope.panel.min_count;
      var facet_field = '&facet.field=' + $scope.panel.field + '&facet=on';
      $scope.panel.queries.query =  querySrv.getQuery(0) + wt + rows_limit + facet_limit + facet_field + fq;
      //alert(querySrv.getQuery(0));
      // Set the additional custom query
      if ($scope.panel.queries.custom != null) {
          request = request.setQuery($scope.panel.queries.query + $scope.panel.queries.custom);
      } else {
          request = request.setQuery($scope.panel.queries.query);
      }

      // Execute the search and get results
      //alert("inside relationship 2");
      //var results = request.doRelatoinshipSearch();
      var results = request.doRelationshipSearch();
      // Populate scope when we have results

      results.then(function(results) {
        $scope.data = {};

        //var parsedResults = d3.csv.parse(results, function(d) {
        //  d[$scope.panel.field] = +d[$scope.panel.field]; // coerce to number
        //  return d;
        //});

        //$scope.data = _.pluck(parsedResults,$scope.panel.field);
        $scope.data = results.recursive_facet_result;
        $scope.render();
      });

      //$scope.data = results.recursive_search_result;


      // Hide the spinning wheel icon
      $scope.panelMeta.loading = false;
    };
  });

  module.directive('relationshipChart', function() {
    return {
      restrict: 'E',
      link: function(scope, element) {
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

          var source_text = "";
          var target_text = "";
          var parent_width = element.parent().width();
          //alert("width"+parent_width);
          var height = 500; //parseInt(scope.row.height+1500);
          var width = parent_width - 20;
          var links = [
            {source: "Microsoft", target: "Amazon", type: "suit"},
            {source: "Microsoft", target: "HTC", type: "suit"},
            {source: "Samsung", target: "Apple", type: "suit"},
            {source: "Motorola", target: "Apple", type: "suit"},
            {source: "Nokia", target: "Apple", type: "suit"},
            {source: "HTC", target: "Apple", type: "suit"},
            {source: "Kodak", target: "Apple", type: "suit"},
            {source: "Microsoft", target: "Barnes & Noble", type: "suit"},
            {source: "Microsoft", target: "Foxconn", type: "suit"},
            {source: "Oracle", target: "Google", type: "suit"},
            {source: "Apple", target: "HTC", type: "suit"},
            {source: "Microsoft", target: "Inventec", type: "suit"},
            {source: "Samsung", target: "Kodak", type: "suit"},
            {source: "LG", target: "Kodak", type: "suit"},
            {source: "RIM", target: "Kodak", type: "suit"},
            {source: "Sony", target: "LG", type: "suit"},
            {source: "Kodak", target: "LG", type: "suit"},
            {source: "Apple", target: "Nokia", type: "suit"},
            {source: "Qualcomm", target: "Nokia", type: "suit"},
            {source: "Apple", target: "Motorola", type: "suit"},
            {source: "Microsoft", target: "Motorola", type: "suit"},
            {source: "Motorola", target: "Microsoft", type: "suit"},
            {source: "Huawei", target: "ZTE", type: "suit"},
            {source: "Ericsson", target: "ZTE", type: "suit"},
            {source: "Kodak", target: "Samsung", type: "suit"},
            {source: "Apple", target: "Samsung", type: "suit"},
            {source: "Kodak", target: "RIM", type: "suit"},
            {source: "Nokia", target: "Qualcomm", type: "suit"}
          ];
          links = [];
          for (var item in scope.data){
              var itemInside = scope.data[item].split(':');
              links.push({"source":itemInside[0],"target":itemInside[1],type:"suit"});
          }
          var nodes = {};

          // Compute the distinct nodes from the links.
          links.forEach(function(link) {
            link.source = nodes[link.source] || (nodes[link.source] = {name: link.source});
            link.target = nodes[link.target] || (nodes[link.target] = {name: link.target});
          });

          //var width = 960,
          //    height = 500;
          var force = d3.layout.force()
              .nodes(d3.values(nodes))
              .links(links)
              .size([width, height])
              .linkDistance(60)
              .charge(-400)
              .on("tick", tick)
              .start();

          var svg = d3.select(element[0]).append("svg")
              .attr("width", width)
              .attr("height", height);

          // Per-type markers, as they don't inherit styles.
          svg.append("defs").selectAll("marker")
              .data(["suit", "licensing", "resolved"])
            .enter().append("marker")
              .attr("id", function(d) { return d; })
              .attr("viewBox", "0 -5 10 10")
              .attr("refX", 15)
              .attr("refY", -1.5)
              .attr("markerWidth", 6)
              .attr("markerHeight", 6)
              .attr("orient", "auto")
              .append("path")
              .attr("d", "M0,-5L10,0L0,5");

          var path = svg.append("g").selectAll("path")
              .data(force.links()).enter()
              .append("path")
              .attr("class", function(d) {
              			return "link " + d.type;
               })
              .attr("stroke", function(d) {
              			return "url(#" + d.type + ")";
               });

          var circle = svg.append("g").selectAll("circle")
              .data(force.nodes())
              .enter().append("circle")
              .attr("r", 8)
              .call(force.drag);

          var text = svg.append("g").selectAll("text")
              .data(force.nodes())
              .enter().append("text")
              .attr("x", 8)
              .attr("y", ".31em")
              .attr("class", function(d) {
               		//if (d.name == source_text || d.name == target_text) {
               			//return "text2";
               		//} else {
               			return "text";
               		//}
               })
              .text(function(d) { return d.name; });

          // Use elliptical arc path segments to doubly-encode directionality.
          function tick() {
            path.attr("d", linkArc);
            circle.attr("transform", transform);
            text.attr("transform", transform);
          }

          function linkArc(d) {
            var dx = d.target.x - d.source.x,
                dy = d.target.y - d.source.y,
                dr = Math.sqrt(dx * dx + dy * dy);
            return "M" + d.source.x + "," + d.source.y + "A" + dr + "," + dr + " 0 0,1 " + d.target.x + "," + d.target.y;
          }

          function transform(d) {
            return "translate(" + d.x + "," + d.y + ")";
          }
        }
      }
    };
  });
});
