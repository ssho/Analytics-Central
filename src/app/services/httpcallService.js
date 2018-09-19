define([
  'angular',
  'underscore'
],
function (angular, _) {
  'use strict';

  var module = angular.module('kibana.services');

  module.service('httpcallService', function($http) {
    // This service really just tracks a list of $timeout promises to give us a
    // method for cancelling them all when we need to
    var selectedEditKeywordId = 0;
    var selectedEditKeyword = "";

    this.getData = function() {
          return $http.get('http://www.yahoo.com');  //1. this returns promise
    };
    this.add = function(a, b) { return a + b };
  });

});
