define([
  'angular',
  'jquery',
  'kbn',
  'underscore',
  'config',
  'moment',
  'modernizr',
  'filesaver'
],
function (angular, $, kbn, _, config, moment, Modernizr) {
  'use strict';

  var DEBUG = false; // DEBUG mode

  var module = angular.module('kibana.services');

  module.service('dashboard', function($routeParams, $http, $rootScope, $injector, $location,
    sjsResource, timer, kbnIndex, alertSrv
  ) {
    this.dashboardTitle = "";
    // A hash of defaults to use when loading a dashboard
    var _dash = {
      title: "",
      style: "dark",
      editable: true,
      failover: false,
      panel_hints: true,
      rows: [],
      services: {},
      loader: {
        dropdown_collections: false,
        save_gist: true,
        save_elasticsearch: true,
        save_local: true,
        save_default: true,
        save_temp: true,
        save_temp_ttl_enable: true,
        save_temp_ttl: '30d',
        load_gist: true,
        load_elasticsearch: true,
        load_elasticsearch_size: 10,
        load_local: true,
        hide: false,
        user_selected_time_mode: "",
        user_selected_time_option: ""
      },
      index: {
        interval: 'none', // this will always be none because we disable 'Index Settings' tab in dasheditor.html
        pattern: '_all',
        default: 'INDEX_MISSING'
      },
      solr: {
        server: config.solr,
        core_name: config.solr_core,
        core_list: [],
        global_params: ''
      },
      dashboardList :[],
      userDashboardList :[],
      systemDashboardList:[],
      showUserDashboardList:false
    };

    var sjs = sjsResource(config.solr + config.solr_core);
    var gist_pattern = /(^\d{5,}$)|(^[a-z0-9]{10,}$)|(gist.github.com(\/*.*)\/[a-z0-9]{5,}\/*$)/;
    /*     ...     */
    // Store a reference to this
    var self = this;
    var filterSrv,querySrv;

    var defaultDashboardID = 0;
    this.current = _.clone(_dash);
    this.last = {};
    $rootScope.currentDashboardID = -1;
    $rootScope.$on('$routeChangeSuccess',function() {
      // Clear the current dashboard to prevent reloading
      self.current = {};
      self.indices = [];
      route();
    });

    var route = function() {
      // Is there a dashboard type and id in the URL?
      if(!(_.isUndefined($routeParams.kbnType)) && !(_.isUndefined($routeParams.kbnId))) {
        var _type = $routeParams.kbnType;
        var _id = $routeParams.kbnId;
        
        switch(_type) {
        case ('elasticsearch'):
          self.elasticsearch_load('dashboard',_id);
          break;
        case ('solr'):
          self.elasticsearch_load('dashboard',_id);
          break;
        case ('temp'):
          self.elasticsearch_load('temp',_id);
          break;
        case ('file'):
          self.file_load(_id);
          break;
        case('script'):
          self.script_load(_id);
          break;
        default:
          self.file_load('default.json');
        }

      // No dashboard in the URL
      } else {
        // Check if browser supports localstorage, and if there's a dashboard
        if (Modernizr.localstorage &&
          !(_.isUndefined(window.localStorage['dashboard'])) &&
          window.localStorage['dashboard'] !== ''
        ) {

          //alert("inside load dashboard");
          var dashboard = JSON.parse(window.localStorage['dashboard']);
          self.dash_load(dashboard);

          //window.localStorage['dashboard'] = '';
          //self.file_load('default.json');

        // No? Ok, grab default.json, its all we have now
        } else {

          //alert("default json");
          //self.file_load('default.json');
        }
      }
    };

    // Since the dashboard is responsible for index computation, we can compute and assign the indices
    // here before telling the panels to refresh
    this.refresh = function() {
      // Retrieve Solr collections for the dashboard

      kbnIndex.collections(self.current.solr.server,$rootScope.token).then(function (p) {
        if (DEBUG) { console.debug('dashboard: kbnIndex.collections p = ',p); }
        if (p.length > 0) {
          self.current.solr.core_list = p;
        } else {
          // No collections returned from Solr
          // Display alert only if USE_ADMIN_CORES flag in config.js is true.
          if (config.USE_ADMIN_CORES) {
            alertSrv.set('No collections','There were no collections returned from Solr.','info',5000);
          }
        }
      });

      if(self.current.index.interval !== 'none') {
        if(filterSrv.idsByType('time').length > 0) {
          var _range = filterSrv.timeRange('min');
          kbnIndex.indices(_range.from,_range.to,
            self.current.index.pattern,self.current.index.interval
          ).then(function (p) {
            if (DEBUG) { console.debug('dashboard: p = ',p); }

            if(p.length > 0) {
              self.indices = p;
            } else {
              // Option to not failover
              if(self.current.failover) {
                self.indices = [self.current.index.default];
              } else {
                // Do not issue refresh if no indices match. This should be removed when panels
                // properly understand when no indices are present
                alertSrv.set('No results','There were no results because no indices were found that match your'+
                  ' selected time span','info',5000);
                return false;
              }
            }

            $rootScope.$broadcast('refresh');
          });
        } else {
          if(self.current.failover) {
            self.indices = [self.current.index.default];
            $rootScope.$broadcast('refresh');
          } else {
            alertSrv.set("No time filter",
              'Timestamped indices are configured without a failover. Waiting for time filter.',
              'info',5000);
          }
        }
      } else {
        self.indices = [self.current.index.default];
        $rootScope.$broadcast('refresh');
      }

      if (DEBUG) { console.debug('dashboard: after refresh',self); }
    };

    var dash_defaults = function(dashboard) {
      _.defaults(dashboard,_dash);
      _.defaults(dashboard.index,_dash.index);
      _.defaults(dashboard.loader,_dash.loader);
      // Solr
      _.defaults(dashboard.collection,_dash.collection);
      //alert("11111"+dashboard.current.solr.core_name);
      return dashboard;
    };

    this.dash_load = function(dashboard) {
      // Cancel all timers
      timer.cancel_all();

      // update browser window/tab title to reflect current dashboard's title
      //document.title = dashboard.title;
      // update the dashboard title on the dashboard navigation bar
      this.dashboardTitle = dashboard.title;

      // Make sure the dashboard being loaded has everything required
      dashboard = dash_defaults(dashboard);
      //alert("22222"+dashboard.current.solr.core_name);
      self.get_dashboard_list();

      // If not using time based indices, use the default index
      if(dashboard.index.interval === 'none') {
        self.indices = [dashboard.index.default];
      }

      self.current = _.clone(dashboard);

      // Ok, now that we've setup the current dashboard, we can inject our services
      querySrv = $injector.get('querySrv');
      filterSrv = $injector.get('filterSrv');

      // Make sure these re-init
      querySrv.init();
      filterSrv.init();

      // If there's an index interval set and no existing time filter, send a refresh to set one
      if(dashboard.index.interval !== 'none' && filterSrv.idsByType('time').length === 0) {
        self.refresh();
      }

      return true;
    };

    this.gist_id = function(string) {
      if(self.is_gist(string)) {
        return string.match(gist_pattern)[0].replace(/.*\//, '');
      }
    };

    this.is_gist = function(string) {
      if(!_.isUndefined(string) && string !== '' && !_.isNull(string.match(gist_pattern))) {
        return string.match(gist_pattern).length > 0 ? true : false;
      } else {
        return false;
      }
    };

    this.to_file = function() {
      var blob = new Blob([angular.toJson(self.current,true)], {type: "text/json;charset=utf-8"});
      // from filesaver.js
      window.saveAs(blob, self.current.title+"-"+new Date().getTime());
      return true;
    };

    this.remove_all_user_input_data_on_performamnce_chart = function(){
      for (var key in self.current.rows) {
         for (var rowitem in self.current.rows[key]){
             if (rowitem === "panels") {
                 for (var panelitem in self.current.rows[key].panels){
                     //console.log("found key ");
                     if (self.current.rows[key].panels[panelitem].hasOwnProperty("user_input_start_date")){
                         self.current.rows[key].panels[panelitem].user_input_start_date = "";
                         self.current.rows[key].panels[panelitem].user_input_end_date = "";
                         self.current.rows[key].panels[panelitem].user_input_amount = 0;
                     }
                 }
             }
         }
      }
    };

    this.save_dashboard_to_server = function(saveDashboard) {

        //console.log(JSON.stringify(saveDashboard));      
        if (typeof(saveDashboard.inputDashboardName) == 'undefined') {          
           return false;
        }else{
           var isDefault = 0 ;
           /*if (saveDashboard.setAsDefaultDashboard == '1') {
               isDefault = true;
           }*/
           self.current.title = saveDashboard.inputDashboardName;
           self.current.userDashboardList = [];
           self.current.systemDashboardList = [];
           self.remove_all_user_input_data_on_performamnce_chart();
           
           var newUserObject = {"id":parseInt($rootScope.currentUserId)};
           var sendDataObject = { "user" : newUserObject,
                                  "dashboardName" : saveDashboard.inputDashboardName,
                                  "active" : 1,
                                  "dashboardObject" : JSON.stringify(self.current),
                                  //"isDefault":isDefault,                                  
                                  "id":$rootScope.currentDashboardID
                                };
           return $http({
             url: config.sitehttp + config.siteURL + config.saveDashboardtoServerURL + "?overwrite=0&isDefault=" + isDefault,
             method: "POST",
             headers: { 'Content-Type': 'application/json',
                       'Authorization': 'Bearer ' + $rootScope.token },
             data: sendDataObject
           }).then(function(result) {
             //self.current.get_dashboard_list(); 
             if(!result) {
               return false;
             }
             self.get_dashboard_list(); 
             if (result.actionResult === "success"){
                 //do nothing
             } else {            
                // save fail, ask confirmation
                 if (!result.data.actionAllow){
                   alert(result.data.message);
                   return true;
                }
                if (confirm(result.data.message)) {                   
                   console.log("save again ");
                   return $http({
                                url: config.sitehttp + config.siteURL + config.saveDashboardtoServerURL + "?overwrite=1&isDefault=" + isDefault,
                                method: "POST",
                                headers: { 'Content-Type': 'application/json',
                                          'Authorization': 'Bearer ' + $rootScope.token },
                                data: sendDataObject
                              }).then(function(result) {
                                self.get_dashboard_list(); 
                                return true;
                              });
                } else {
                  return true;
                }
             }
             return true;
           },function(result) {
             alertSrv.set('Error','Save to server failed.');
             alert('Error happened!');
             return false;
           });
        }
    };

    this.setAsDefaultDashboard = function(){
        console.log("inside set as default dashboard in dashboard.js");       
        return $http({
            url: config.sitehttp + config.siteURL+ '/user/'+ $rootScope.currentUserId + '/'
            + config.setAsDefaultDashboard + '/' + $rootScope.currentDashboardID,
            method: "POST",
            headers: { 'Content-Type': 'application/json',
                       'Authorization': 'Bearer ' + $rootScope.token }
        }).then(function(result) {
            if(!result) {
               return false;
            }
            // find the newest dashboard id , if it is a new dashboard
            defaultDashboardID = $rootScope.currentDashboardID;
            self.get_dashboard_list();
            alert('Set as a default dashboard done.');
            return true;
        },function(result) {
            alert('Set as a default dashboard error.');
            return false;
        });      

    };

    this.load_dashboard = function(dashboardItemClicked){
        
        var isSystemDefaultValue = "0";
        if ( dashboardItemClicked.isSystemDefault ){ isSystemDefaultValue="1" }
        return $http({
            url: config.sitehttp + config.siteURL + config.getDashboardURL
                + '/' + dashboardItemClicked.dashboardID
                + "?userId=" + $rootScope.currentUserId + "&isSystemDefault=" + isSystemDefaultValue,
            method: "GET",
            headers: { 'Authorization': 'Bearer ' + $rootScope.token }
        }).then(function(result) {
            if(!result) {
               return false;
            }
            var dashboardObject = JSON.parse(result.data.dashboardObject);  // need to test
            dashboardObject.solr.server = config.sitehttp + config.siteURL + '/solr/';  // overwrite it with config's
            dashboardObject.solr.core_name = config.solrCollectionName;  // overwrite it with config's
            $rootScope.currentDashboardID = result.data.id;
            self.dash_load(dashboardObject);
            self.refresh();

            return true;
        },function(result) {
            return false;
        });
    };
    this.get_user_default_dashboard = function(dashboard) {

      //alert("inside get_user_default_dashboard");
      return $http({
        url: config.sitehttp + config.siteURL + config.getUserDefaultDashboard + "?userId=" + $rootScope.currentUserId,
          method: "GET",
          headers: { 'Authorization': 'Bearer ' + $rootScope.token }
        }).then(function(result) {
          if(!result) {
            return false;
          }
          
          var dashboardObject = result.data.dashboardObject;  // need to test
          var tempJSONObject = JSON.parse(dashboardObject);
          // make sure solr core = user's collection
          tempJSONObject.solr.core_name = config.solrCollectionName;
          tempJSONObject.solr.server = config.sitehttp + config.siteURL + '/solr/';
          //console.log("777:"+JSON.stringify(tempJSONObject));
          $rootScope.currentDashboardID = result.data.id;
          defaultDashboardID = $rootScope.currentDashboardID;
          self.dash_load(tempJSONObject);
          self.refresh();
          return true;
        },function() {
          alertSrv.set('Error',"get Dashboard list failed");
           //alert("inside get board list ");
           //alert(dashboard);
           //alert(JSON.stringify(self.current.dashboardList));
          return false;
        });

    };
    this.get_dashboard_list = function(){

      return $http({
        url: config.sitehttp + config.siteURL + config.getDashboardListURL + "?userId=" + $rootScope.currentUserId,
        method: "GET",
        headers: { 'Authorization': 'Bearer ' + $rootScope.token },
        cache: false
      }).then(function(result) {
        if(!result) {
          return false;
        }
        var userHasHisOwnDefaultDashboard = false;
       //var resultSet = [];
        var resultSetUserDashboard = result.data.userDashboardList;
        var resultSetSystemDashboard = result.data.userDashboardSystemList;

        self.current.dashboardList = [];
        self.current.userDashboardList = [];
        self.current.systemDashboardList = [];
        self.current.showUserDashboardList = true;
        //check user has his own default dashboard or not
        var star;
        for (var item in resultSetUserDashboard){
           star = "  ";
           if (resultSetUserDashboard[item].dashboardID === defaultDashboardID){
               userHasHisOwnDefaultDashboard = true;
              star = " *";
           }
           self.current.userDashboardList.push({"dashboardID":resultSetUserDashboard[item].dashboardID,
                                                 "dashboardName":resultSetUserDashboard[item].dashboardName + star,
                                                 //"isDefault":resultSetUserDashboard[item].isdefault,
                                                 "isSystemDefault":false, //resultSet[item].issystemdefault,
                                                 "date":resultSetUserDashboard[item].createdat});
        }

        for (var item in resultSetSystemDashboard){
           star = "  ";
           if ((resultSetSystemDashboard[item].dashboardID === defaultDashboardID) && !userHasHisOwnDefaultDashboard){
               star = " *";
           }
           self.current.systemDashboardList.push({"dashboardID":resultSetSystemDashboard[item].dashboardID,
                                                 "dashboardName":resultSetSystemDashboard[item].dashboardName + star,
                                                 //"isDefault":false,//resultSetSystemDashboard[item].isdefault,
                                                 "isSystemDefault":true,
                                                 "date":resultSetSystemDashboard[item].createdat});
        }
       
        return true;
      },function() {
        alertSrv.set('Error',"get Dashboard list failed");        
        return false;
      });
    };

    this.set_default = function(dashboard) {
      if (Modernizr.localstorage) {
        window.localStorage['dashboard'] = angular.toJson(dashboard || self.current);
        $location.path('/dashboard');
        return true;
      } else {
        return false;
      }
    };

    this.purge_default = function() {
      if (Modernizr.localstorage) {
        window.localStorage['dashboard'] = '';
        return true;
      } else {
        return false;
      }
    };

    // TOFIX: Pretty sure this breaks when you're on a saved dashboard already
    this.share_link = function(title,type,id) {
      return {
        location  : window.location.href.replace(window.location.hash,""),
        type      : type,
        id        : id,
        link      : window.location.href.replace(window.location.hash,"")+"#dashboard/"+type+"/"+id,
        title     : title
      };
    };

    var renderTemplate = function(json,params) {
      var _r;
      _.templateSettings = {interpolate : /\{\{(.+?)\}\}/g};
      var template = _.template(json);
      var rendered = template({ARGS:params});
      try {
        _r = angular.fromJson(rendered);
      } catch(e) {
        _r = false;
      }
      return _r;
    };

    this.file_load = function(file) {
      return $http({
        url: "app/dashboards/"+file+'?' + new Date().getTime(),
        method: "GET",
        transformResponse: function(response) {
          return renderTemplate(response,$routeParams);
        }
      }).then(function(result) {
        if(!result) {
          return false;
        }
        //alert("inside file load ");
        result.data.solr.core_name = $rootScope.currentUser + '_collection';
        self.dash_load(dash_defaults(result.data));
        return true;
      },function() {
        alertSrv.set('Error',"Could not load <i>dashboards/"+file+"</i>. Please make sure it exists" ,'error');
        return false;
      });
    };

    this.elasticsearch_load = function(type,id) {
      return $http({
        url: config.solr + config.banana_index + '/select?wt=json&q=title:"' + id + '"',
        method: "GET",
        transformResponse: function(response) {
          response = angular.fromJson(response);
          var source_json = angular.fromJson(response.response.docs[0].dashboard);

          if (DEBUG) { console.debug('dashboard: type=',type,' id=',id,' response=',response,' source_json=',source_json); }

          // return renderTemplate(angular.fromJson(response)._source.dashboard, $routeParams);
          // return renderTemplate(JSON.stringify(source_json.dashboard), $routeParams);
          return renderTemplate(JSON.stringify(source_json), $routeParams);
        }
      }).error(function(data, status) {
        if(status === 0) {
          alertSrv.set('Error',"Could not contact Solr at "+config.solr+
            ". Please ensure that Solr is reachable from your system." ,'error');
        } else {
          alertSrv.set('Error','Could not find dashboard named "'+id+'". Please ensure that the dashboard name is correct or exists in the system.','error');
        }
        return false;
      }).success(function(data) {
        self.dash_load(data);
      });
    };

    this.script_load = function(file) {
      return $http({
        url: "app/dashboards/"+file,
        method: "GET",
        transformResponse: function(response) {
          /*jshint -W054 */
          var _f = new Function('ARGS','kbn','_','moment','window','document','angular','require','define','$','jQuery',response);
          return _f($routeParams,kbn,_,moment);
        }
      }).then(function(result) {
        if(!result) {
          return false;
        }
        self.dash_load(dash_defaults(result.data));
        return true;
      },function() {
        alertSrv.set('Error',
          "Could not load <i>scripts/"+file+"</i>. Please make sure it exists and returns a valid dashboard" ,
          'error');
        return false;
      });
    };

    this.elasticsearch_save = function(type,title,ttl) {
      // Clone object so we can modify it without influencing the existing obejct
      var save = _.clone(self.current);
      var id;

      // Change title on object clone
      if (type === 'dashboard') {
        id = save.title = _.isUndefined(title) ? self.current.title : title;
      }

      // Create request with id as title. Rethink this.
      // Use id instead of _id, because it is the default field of Solr schema-less.
      var request = sjs.Document(config.banana_index,type,id).source({
        // _id: id,
        id: id,
        user: 'guest',
        group: 'guest',
        title: save.title,
        dashboard: angular.toJson(save)
      });

      request = type === 'temp' && ttl ? request.ttl(ttl) : request;

      // Solr: set sjs.client.server to use 'banana-int' for saving dashboard
      sjs.client.server(config.solr + config.banana_index);

      return request.doIndex(
        // Success
        function(result) {
          if(type === 'dashboard') {
            $location.path('/dashboard/solr/'+title);
          }
          return result;
        },
        // Failure
        function() {
          return false;
        }
      );
    };

    this.elasticsearch_delete = function(id) {
      // Set sjs.client.server to use 'banana-int' for deleting dashboard
      sjs.client.server(config.solr + config.banana_index);

      return sjs.Document(config.banana_index,'dashboard',id).doDelete(
        // Success
        function(result) {
          return result;
        },
        // Failure
        function() {
          return false;
        }
      );
    };

    this.elasticsearch_list = function(query, count) {
      // set indices and type
      var solrserver = self.current.solr.server + config.banana_index || config.solr + config.banana_index;
      sjs.client.server(solrserver);

      var request = sjs.Request().indices(config.banana_index).types('dashboard');

      // Need to set sjs.client.server back to use 'logstash_logs' collection
      // But cannot do it here, it will interrupt other modules.
      // sjs.client.server(config.solr);

      return request.query(
        sjs.QueryStringQuery(query || '*:*')
        ).size(count).doSearch(
          // Success
          function(result) {
            return result;
          },
          // Failure
          function() {
            return false;
          }
        );

    };

    this.save_gist = function(title, dashboard) {
      var save = _.clone(dashboard || self.current);
      save.title = title || self.current.title;
      return $http({
        url: "https://api.github.com/gists",
        method: "POST",
        data: {
          "description": save.title,
          "public": false,
          "files": {
            "banana-dashboard.json": {
              "content": angular.toJson(save, true)
            }
          }
        }
      }).then(function(data) {
        return data.data.html_url;
      }, function() {
        return false;
      });
    };

    this.gist_list = function(id) {
      return $http.jsonp("https://api.github.com/gists/"+id+"?callback=JSON_CALLBACK"
      ).then(function(response) {
        var files = [];
        _.each(response.data.data.files,function(v) {
          try {
            var file = JSON.parse(v.content);
            files.push(file);
          } catch(e) {
            return false;
          }
        });
        return files;
      }, function() {
        return false;
      });
    };

    this.numberWithCommas = function(x) {
      if (x) {
        return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
      } else {
        return x;
      }
    };

  });

});
