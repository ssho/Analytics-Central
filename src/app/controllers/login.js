define([
        'angular',
        'config',
        'app',
        'underscore'
    ],
    function (angular, config, app, _) {
        'use strict';

        var module = angular.module('kibana.controllers');

        module.controller('LoginCtrl', function ($scope, $rootScope, $location, $timeout, $http,
                                                 ejsResource, sjsResource, querySrv) {
                delete $rootScope.currentUser;
                delete $rootScope.authenticated;
                $scope.password = "";
                $rootScope.currentUserId = 0;
                $rootScope.userSolrCollection = '';
                $rootScope.menuList = [];
                $rootScope.userDefaultHome = "";

                $scope.init = function () {
                    $scope.username = "";
                    $scope.password = "";


                };


                $scope.getUserId = function (username) {
                    $http({
                        url: config.sitehttp + config.siteURL + config.getUserIdURL
                        + '?username=' + username,
                        headers: {'Authorization': 'Bearer ' + $rootScope.token},
                        method: 'GET',
                    })
                        .then(function (response) {
                                $rootScope.currentUserId = response.data;
                                //$location.path("/liveTraffic");
                                $scope.getMenuItemList();

                            },
                            function (response) { // optional
                                $scope.hasErrorMessage = true;
                                $scope.errorMessage = "Get user id failed.";
                            });
                };

                // TODO Do we need this function?
                $scope.getUserSolrCollection = function (username) {
                    $http({
                        url: config.sitehttp + config.siteURL + config.getUserSolrCollectionURL
                        + '?username=' + username,
                        headers: {'Authorization': 'Bearer ' + $rootScope.token},
                        method: 'GET',
                    })
                        .then(function (response) {
                                $rootScope.userSolrCollection = response.data.solrCollection;
                            },
                            function (response) { // optional
                                $scope.hasErrorMessage = true;
                                $scope.errorMessage = "Get user id failed.";
                            });
                };

                $scope.getMenuItemList = function () {
                    $rootScope.menuList = [];
                    $http({
                        url: config.sitehttp + config.siteURL + config.getMenuURL,
                        headers: {'Authorization': 'Bearer ' + $rootScope.token},
                        method: 'GET'
                    })
                        .then(function (response) {

                                var menuObject = response.data[0].userMenuList;
                                $rootScope.userSolrCollection = response.data[0].userSolrCollectionList;

                                // TODO Need to make the "solrCollectionDataTypes" dynamic based on if user has access
                                $rootScope.solrCollectionDataTypes = [{
                                    name: "wsi_proxy",
                                    options: ["Page view", "Page hit", "Traffic volume"]
                                }, {name: "ultrareach_proxy", options: ["Page hit", "Traffic volume"]}, {
                                    name: "psiphon_proxy",
                                    options: ["Page view", "Traffic volume"]
                                }];


                                //var menuItemCount = menuObject.length;
                                for (var menuItem in menuObject) {
                                    if (menuObject[menuItem].home) {
                                        var temp1 = menuObject[menuItem].url;
                                        temp1 = temp1.replace("#", "");
                                        $rootScope.userDefaultHome = temp1;
                                    }
                                    $rootScope.menuList.push({
                                        "item": menuObject[menuItem].item,
                                        "url": menuObject[menuItem].url,
                                        "order": menuObject[menuItem].itemOrder
                                    });
                                }
                                //Go to user's home
                                $location.path($rootScope.userDefaultHome);
                            },
                            function (response) {
                                $scope.hasErrorMessage = true;
                                $scope.errorMessage = "Failed to load menu.";
                            })
                };


                $scope.Login = function () {
                    $scope.hasErrorMessage = false;
                    $scope.errorMessage = "";


                    var formData = "password=" + encodeURIComponent($scope.password) + "&username=" + $scope.username.toLowerCase()
                        + "&grant_type=" + config.grant_type + "&scope=" + config.scope
                        + "&client_secret=" + config.client_secret + "&client_id=" + config.client_id;

                    var authdata = "Basic " + btoa(config.client_id + ':' + config.client_secret);
                    var urlContent = config.sitehttp + config.siteURL + config.oauthURL;
                    var headerContent = {
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'Authorization': authdata
                    };
                    $rootScope.currentUser = null;
                    $rootScope.authenticated = false;
                    $http({
                        url: urlContent,
                        headers: headerContent,
                        method: 'POST',
                        data: formData
                    }).then(function (response) {
                        // $rootScope.currentUser = null;
                        // $rootScope.currentUser = $scope.username.toLowerCase() ;
                        $rootScope.token = response.data.access_token;
                        // $rootScope.authenticated  = true ;
                        // $scope.password = "";


                        $scope.getUserId($scope.username);


                        $http({
                            url: config.sitehttp + config.siteURL + config.getUserIdURL
                            + '?username=' + $scope.username,
                            headers: {'Authorization': 'Bearer ' + $rootScope.token},
                            method: 'GET',
                        })
                            .then(function (response) {
                                    $rootScope.currentUserId = response.data;

                                    // force logoutl
                                    $http({
                                        url: config.sitehttp + config.siteURL + config.logoutURL
                                        + "?userId=" + $rootScope.currentUserId,
                                        headers: {'Authorization': 'Bearer ' + $rootScope.token},
                                        method: 'GET'//,
                                        //data: formData
                                    }).then(function (response) {
                                        //alert("222" + JSON.stringify(response));
                                        // $rootScope.currentUser = null;
                                        // $rootScope.currentUser = $scope.username ;
                                        // $rootScope.token = null;
                                        // $rootScope.authenticated = false ;
                                        // $scope.password = "";
                                        // $location.path("/");

                                        // Force login again
                                        $http({
                                            url: urlContent,
                                            headers: headerContent,
                                            method: 'POST',
                                            data: formData
                                        }).then(function (response) {
                                            $rootScope.currentUser = null;
                                            $rootScope.currentUser = $scope.username.toLowerCase();
                                            $rootScope.token = response.data.access_token;
                                            $rootScope.authenticated = true;
                                            $scope.password = "";
                                            $scope.getUserId($scope.username);
                                            //$scope.getMenuItemList();


                                        });

                                    }, function (response) { // optional
                                        $rootScope.currentUser = null;
                                        $rootScope.currentUser = $scope.username;
                                        $rootScope.token = null;
                                        $rootScope.authenticated = false;
                                        $scope.password = "";
                                        //alert("333" + JSON.stringify(response));
                                        $location.path("/")
                                    });
                                },
                                function (response) { // optional
                                    $scope.hasErrorMessage = true;
                                    $scope.errorMessage = "Get user id failed.";
                                });


                        //    $scope.getUserId($scope.username);
                        //$scope.getMenuItemList();



                    }, function (response) { // optional
                        $scope.password = "";
                        $scope.errorMessage = "Username/Password combination was incorrect!";
                        $scope.hasErrorMessage = true;
                        $location.path("/login")
                    });
                };
            }
        );

    });
