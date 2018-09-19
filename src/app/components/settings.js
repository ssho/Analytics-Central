define(['underscore'],
function (_) {
  "use strict";

  return function Settings (options) {
    /**
     * To add a setting, you MUST define a default. Also,
     * THESE ARE ONLY DEFAULTS.
     * They are overridden by config.js in the root directory
     * @type {Object}
     */

    var defaults = {
      solr: "",
      solr_core: "logstash_logs",
      timefield: 'visit_time',
      banana_index  : 'banana-int',
      USE_ADMIN_LUKE: true,
      USE_ADMIN_CORES: true,
      panel_names   : [],
      grant_type : '',
      scope : '',
      client_secret : '',
      client_id : '',
      oauthURL : '',
      siteURL : '',
      testURL : '',
      sitehttp : '',
      getUserIdURL:'',
      saveDashboardtoServerURL : '',
      getDashboardURL : '',
      getDashboardListURL: '',
      getRelationshipURL: '',
      getUserSolrCollectionURL:'',
      getUserDefaultDashboard:'',
      babelnetURL:'',
      babelnetBubbleSize:'',
      getMenuURL: '',
      logoutURL:'',
      solrCollectionName:'',
      getEventURL:'',
      term_page_query:'',
      term_traffic_query:'',
      range_page_query:'',
      range_traffic_query:'',
      total_page_query:'',
      total_traffic_query:'',
      correlation_query:'',
      wsi_email_success_rate_query:'',
      psiphon_q_for_visit:'',
      psiphon_q_for_volume:'',
      ultrareach_q_for_visit:'',
      ultrareach_q_for_volume:'',
      wsi_collection:'',
      psiphon_collection:'',
      ultrareach_collection:'',
      wsi_proxy:'',
      psiphon_proxy:'',
      ultrareach_proxy:'',
      themeTextFillColor:'',
      changePassword:'',
      setAsDefaultDashboard:'',
      eventInsert:'',
      eventUpdate:'',
      eventDelete:'',
      wsi_page_view_ratio:'',
    };

    // This initializes a new hash on purpose, to avoid adding parameters to
    // config.js without providing sane defaults
    var settings = {};
    _.each(defaults, function(value, key) {
      settings[key] = typeof options[key] !== 'undefined' ? options[key]  : defaults[key];
    });

    return settings;
  };
});
