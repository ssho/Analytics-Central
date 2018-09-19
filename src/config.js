/**
 * This file contains the basic configuration settings for the banana webapp.
 */

define(['settings'],
    function (Settings) {
        "use strict";

        return new Settings({

            /**
             * The default solr server and collection.
             *
             * Banana is designed such that one instance of the webapp can act as a query engine
             * for multiple instances of Solr and multiple Solr collections. In this file, you can
             * specify the default Solr server and the collection that stores the data to be
             * visualized. Each dashboard that you create can (and typically will) override this
             * setting.
             *
             * Note that the solr server address you specify must be resolvable from the browser
             * i.e., from your users' machine. You probably want to set it to the FQDN and port
             * number of your Solr host or the proxy that controls access to your Solr host.
             * By default it is set to localhost:8983, which frequently
             * works for development and testing, when you are running Solr, Banana and the
             * browser on one development/testing machine.
             *
             * After configuring this file, we also suggest you edit the solr server and collection
             * in the default dashboard (app/dashboards/default.json), which is a guided
             * self-starter for building dashboards. You can later replace the pre-defined
             * default.json with the dashboard you want your users to see when they first access
             * your banana web application.
             * @type {String}
             */
            solr: "/solr/",
            solr_core: "_collection",
            timefield: 'visit_time',

            psiphon_q_for_visit: ' AND type_s:page_view',
            psiphon_q_for_volume: ' AND type_s:proxy_bytes_transferred',
            ultrareach_q_for_visit: ' AND (type_s:http OR type_s:https)',
            ultrareach_q_for_volume: ' AND type_s:traffic',


            // Facet by field value. Applied charts: Bar, Tagcloud, Country 
            term_page_query: '&indent=on&wt=json&rows=0&fq=visit_time:[_startdate_%20TO%20_enddate_]&json.facet={total:{type:terms,field:_panelfield_,limit:_limit_,sort:{daily_sum:desc},facet:{daily_sum:%22sum(count)%22}}}',
            term_traffic_query: '&indent=on&wt=json&rows=0&fq=visit_time:[_startdate_%20TO%20_enddate_]&json.facet={total:{type:terms,field:_panelfield_,limit:_limit_,sort:{daily_sum:desc},facet:{daily_sum:%22sum(byte_transferred)%22}}}',

            // Facet by date range. Applied charts: Correlation, Cost Performance, Event with Line, 
            range_traffic_query: '&indent=on&wt=json&rows=0&json.facet={total:{type:range,field:visit_time,' +
            'start:%22_startdate_%22,end:%22_enddate_%22,gap:%22_facetgap_%22,facet:{daily_sum:%27sum(byte_transferred)%27}}}',
            range_page_query: '&indent=on&wt=json&rows=0&json.facet={total:{type:range,field:visit_time,' +
            'start:%22_startdate_%22,end:%22_enddate_%22,gap:%22_facetgap_%22,facet:{daily_sum:%27sum(count)%27}}}',

            // Total sum. Applied charts: Hit
            total_page_query: '&indent=on&wt=json&rows=0&fq=visit_time:[_startdate_%20TO%20_enddate_]&json.facet={total:%22sum(count)%22}',
            total_traffic_query: '&indent=on&wt=json&rows=0&fq=visit_time:[_startdate_%20TO%20_enddate_]&json.facet={total:%22sum(byte_transferred)%22}',

            // Facet by date range for WSI newsletter data. Applied Charts: Correlation  
            wsi_email_success_rate_query: '&indent=on&wt=json&rows=0&json.facet={daily_success_rate:{type:range,field:visit_time,' +
            'start:%22_startdate_%22,end:%22_enddate_%22,gap:%22_facetgap_%22,facet:{success_rate:%27avg(success_rate_d)))%27}}}',

            
            wsi_collection: 'wsi_proxy',
            psiphon_collection: 'psiphon_proxy',
            ultrareach_collection: 'ultrareach_proxy',

            wsi_proxy: 'wsi_collection',
            psiphon_proxy: 'psiphon_collection',
            ultrareach_proxy: 'ultrareach_collection',
            themeTextFillColor: '#D56062',
            /**
             * The default Solr index to use for storing objects internal to Banana, such as
             * stored dashboards. If you have been using a collection named kibana-int
             * to save your dashboards (the default provided in Banana 1.2 and earlier), then you
             * simply need to replace the string "banana-int" with "kibana-int" and your old
             * dashboards will be accessible.
             *
             * This banana-int (or equivalent) collection must be created and available in the
             * default solr server specified above, which serves as the persistence store for data
             * internal to banana.
             * @type {String}
             */
            banana_index: "banana-int",

            /**
             * The default settings will use /admin/luke API to retrieve all fields from Solr including
             * dynamic fields (e.g. *_s, *_t, and etc). And also, it will use /admin/cores API to retrieve
             * all cores/collections from Solr to populate the drop-down collection picker.
             *
             * You can disable the /admin APIs by setting USE_ADMIN_LUKE and USE_ADMIN_CORES flags to false.
             * The effects are that the field list in Table panel will not be able to show the dynamic fields,
             * and the drop-down collection picker will not work.
             *
             * If USE_ADMIN_LUKE is set to false, Banana will use /schema/fields API instead and dynamic fields
             * will not show up in the field list.
             *
             * If USE_ADMIN_CORES is set to false, Banana will not be able to retrieve the list of Solr collections.
             * And also, the dashboard alert about no collections returned from Solr will be disabled.
             * @type {Boolean}
             */
            USE_ADMIN_LUKE: true,
            USE_ADMIN_CORES: true,

            /**
             * Panel modules available. Panels will only be loaded when they are defined in the
             * dashboard. This list is used to populate the drop-down in the "add panel" interface.
             * @type {Array}
             */
            panel_names: [
                {name: "bar", value: "bar"},
                {name: "history", value: "history"},
                {name: "map", value: "map"},
                {name: "table", value: "table"},
                {name: "filtering", value: "filtering"},
                {name: "timepicker", value: "timepicker"},
                //{name:"text",value:"text"},
                {name: "hits", value: "hits"},
                //{name:"column",value:"column"},
                //{name:"ticker",value:"ticker"},

                //{name:"bettermap",value:"bettermap"},
                //{name:"query",value:"query"},
                //{name:"terms",value:"terms"},
                //{name:"rangeFacet",value:"rangeFacet"},
                //{name:"heatmap",value:"heatmap"},
                //{name:"scatterplot",value:"scatterplot"},
                //{name:"fullTextSearch",value:"fullTextSearch"},
                //{name:"facet",value:"facet"},
                {name: "tagcloud", value: "tagcloud"},
                //{name:"multiseries",value:"multiseries"},

                //{name:"sunburst",value:"sunburst"},
                //{name:"docviewer",value:"docviewer"},
                //{name:"bubble",value:"bubble"},
                //{name:"relationship",value:"relationship"},
                {name: "multiline", value: "multiline"},
                {name: "event multiline", value: "eventmultiline"},

                //{name:"usage",value:"usage"},
                {name: "cost performance", value: "costperformance"},
                {name: "event total", value: "lineevent"},
                {name: "country", value: "country"},
                //{name:"comparisons",value:"comparisons"},
                {name: "correlation", value: "correlation"}
            ],
            /* 
             panel_names: [
             'bar',
             'history',
             'map',
             'table',
             'filtering',
             'timepicker',
             'text',
             'hits',
             'column',
             'ticker',
             'bettermap',
             'query',
             'terms',
             'rangeFacet',
             'heatmap',
             'scatterplot',
             'fullTextSearch',
             'facet',
             'tagcloud',
             'multiseries',
             'sunburst',
             'docviewer',
             'bubble',
             'relationship',
             'multiline',
             'eventmultiline'
             ],
             */
            grant_type: 'password',
            scope: 'read write',
            client_secret: '123456',
            client_id: 'clientapp',
            oauthURL: '/oauth/token',
            //siteURL : 'localhost:8091',
            siteURL: 'icca.wasoftware.org/api',
            //testURL : '127.0.0.1:1337',
            sitehttp: 'https://',
            getUserIdURL: '/user/getUserId',
            saveDashboardtoServerURL: '/dashboard/save',
            getDashboardURL: '/dashboard/findByDashboardID',
            getDashboardListURL: '/dashboard/findByUserId',
            getRelationshipURL: '/recursiveCount',
            getUserSolrCollectionURL: '/user/getUserSolrCollection',
            getUserDefaultDashboard: '/dashboard/findDefaultByUserId',
            getMenuURL: '/menu',
            logoutURL: '/user/logout',
            solrCollectionName: 'wsi_collection',
            getEventURL: '/events',
            changePassword: '/user/changepassword',
            setAsDefaultDashboard: '/setAsDefault',
            eventInsert: '/events',
            eventUpdate: '/events',
            eventDelete: '/events/delete',
            wsi_page_view_ratio: 0.04
        });
    });
