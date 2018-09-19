define([
        'angular',
        'config',
        'app',
        'underscore'
    ],
    function (angular, config, app, _) {
        'use strict';

        var module = angular.module('kibana.controllers');

        module.controller('LogoutCtrl', function( $scope, $rootScope, $location,$http) {
               $scope.hasErrorMessage = false;
                  $scope.errorMessage = "";

                  //alert(config.sitehttp + config.siteURL + config.logoutURL + "?userId=" + $rootScope.currentUserId);
                  $http({
                        url : config.sitehttp + config.siteURL + config.logoutURL
                                + "?userId=" + $rootScope.currentUserId,
                        headers : { 'Authorization': 'Bearer ' + $rootScope.token },
                        method: 'GET'//,
                        //data: formData
                  }).then(function(response) {
                        //alert("222" + JSON.stringify(response));
                        $rootScope.currentUser = null;
                        $rootScope.currentUser = $scope.username ;
                        $rootScope.token = null;
                        $rootScope.authenticated = false ;
                        $scope.password = "";
                        $location.path("/");
                  },function(response) { // optional
                        $rootScope.currentUser = null;
                        $rootScope.currentUser = $scope.username ;
                        $rootScope.token = null;
                        $rootScope.authenticated  = false ;
                        $scope.password = "";
                        //alert("333" + JSON.stringify(response));
                        $location.path("/" )
                  });
               

            }
        );

    });
