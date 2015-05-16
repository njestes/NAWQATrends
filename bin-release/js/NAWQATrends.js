//Copyright 2013 USGS Wisconsin Internet Mapping(WiM)
//Author: WiM JS Dev Team
//Created: May 17th, 2013	

//This template has been commented heavily for development purposes. Please delete comments before publishing live mapper code.
//Below are all the dojo.require statements needed for this template mapper. These statements import esri and dijit out-of-box functionality. At bottom are custom wimjits being included.
//This list will vary as features are added to mappers and different Dojo, Esri, or WiM tools are used. 

//04.03.2014 - NE - Added new allLayers object with all map layer info. new functions to automate adding of layers and building of available map layers box and explanation. 
//07.16.2013 - NE - Add functionality for adding icon and execute zoom to scale.
//06.19.2013 - NE - Updated to create lat/lng scale bar programmatically after map is created and ready.
//06.18.2013 - TR - Added dojo.Color style to USGSLinks <a> tags
//06.03.2013 - ESM - Adds function to build and display usgs links on user logo click

dojo.require("esri.arcgis.utils");
dojo.require("esri.dijit.Popup");
dojo.require("esri.dijit.Legend");
dojo.require("esri.dijit.BasemapGallery");
dojo.require("esri.geometry.webMercatorUtils")
dojo.require("esri.graphic");
dojo.require("esri.map");
dojo.require("esri.renderers.UniqueValueRenderer");
dojo.require("esri.symbol");
dojo.require("esri.tasks.IdentifyParameters");
dojo.require("esri.tasks.IdentifyTask");
dojo.require("esri.tasks.LegendLayer");
dojo.require("esri.tasks.locator");
dojo.require("esri.tasks.PrintParameters");
dojo.require("esri.tasks.PrintTask");
dojo.require("esri.tasks.query");
dojo.require("esri.virtualearth.VETiledLayer");

dojo.require("dijit.form.CheckBox");
dojo.require("dijit.layout.BorderContainer");
dojo.require("dijit.layout.ContentPane");
dojo.require("dijit.TitlePane");
dojo.require("dijit.Tooltip");

dojo.require("wim.CollapsingContainer-min");
dojo.require("wim.Disclaimer-min");
dojo.require("wim.ExtentNav-min");
dojo.require("wim.LatLngScale-min");
dojo.require("wim.LoadingScreen-min");
dojo.require("wim.RefreshScreen-min");


//various global variables are set here (Declare here, instantiate below)     
var map, legendLayers = [];
var layersObject = [];
var layerArray = [];
var radioGroupArray = [];
var staticLegendImage;
var identifyTask, identifyParams;
var navToolbar;
var locator;

var renderer;
var renderer2;
var orangeBigSymbol;
var greenBigSymbol;
var orangeSmallSymbol;
var greenSmallSymbol;
var blankSymbol;
var noDataSymbol;

var z = 0;

var legend;

var orgSel;
var inorgSel;

var constObj;

var sucode4FeatureLinkZoom;
     
function init() {
	//sets up the onClick listeners for the USGS logo and help text
	dojo.connect(dojo.byId("usgsLogo"), "onclick", showUSGSLinks);
	dojo.connect(dojo.byId("moreInfoButton"), "onclick", showHelpText);
	dojo.connect(dojo.byId("arrowSizeRelative"), "onclick", showConstituentExp);

	// Added for handling of ajaxTransport in IE
    if (!jQuery.support.cors && window.XDomainRequest) {
    var httpRegEx = /^https?:\/\//i;
    var getOrPostRegEx = /^get|post$/i;
    var sameSchemeRegEx = new RegExp('^'+location.protocol, 'i');
    var xmlRegEx = /\/xml/i;

    esri.addProxyRule({
    	urlPrefix: "http://wimsharedlb-418672833.us-east-1.elb.amazonaws.com/arcgis/rest/services/Utilities/PrintingTools",
    	proxyUrl: "http://107.20.96.245/SIGLProxies/proxy.ashx"
    })

    // ajaxTransport exists in jQuery 1.5+
    jQuery.ajaxTransport('text html xml json', function(options, userOptions, jqXHR){
        // XDomainRequests must be: asynchronous, GET or POST methods, HTTP or HTTPS protocol, and same scheme as calling page
        if (options.crossDomain && options.async && getOrPostRegEx.test(options.type) && httpRegEx.test(userOptions.url) && sameSchemeRegEx.test(userOptions.url)) {
            var xdr = null;
            var userType = (userOptions.dataType||'').toLowerCase();
            return {
                send: function(headers, complete){
                    xdr = new XDomainRequest();
                    if (/^\d+$/.test(userOptions.timeout)) {
                        xdr.timeout = userOptions.timeout;
                    }
                    xdr.ontimeout = function(){
                        complete(500, 'timeout');
                    };
                    xdr.onload = function(){
                        var allResponseHeaders = 'Content-Length: ' + xdr.responseText.length + '\r\nContent-Type: ' + xdr.contentType;
                        var status = {
                            code: 200,
                            message: 'success'
                        };
                        var responses = {
                            text: xdr.responseText
                        };

                                try {
                                    if (userType === 'json') {
                                        try {
                                            responses.json = JSON.parse(xdr.responseText);
                                        } catch(e) {
                                            status.code = 500;
                                            status.message = 'parseerror';
                                            //throw 'Invalid JSON: ' + xdr.responseText;
                                        }
                                    } else if ((userType === 'xml') || ((userType !== 'text') && xmlRegEx.test(xdr.contentType))) {
                                        var doc = new ActiveXObject('Microsoft.XMLDOM');
                                        doc.async = false;
                                        try {
                                            doc.loadXML(xdr.responseText);
                                        } catch(e) {
                                            doc = undefined;
                                        }
                                        if (!doc || !doc.documentElement || doc.getElementsByTagName('parsererror').length) {
                                            status.code = 500;
                                            status.message = 'parseerror';
                                            throw 'Invalid XML: ' + xdr.responseText;
                                        }
                                        responses.xml = doc;
                                    }
                                } catch(parseMessage) {
                                    throw parseMessage;
                                } finally {
                                    complete(status.code, status.message, responses, allResponseHeaders);
                                }
                            };
                            xdr.onerror = function(){
                                complete(500, 'error', {
                                    text: xdr.responseText
                                });
                            };
                            xdr.open(options.type, options.url);
                            //xdr.send(userOptions.data);
                            xdr.send();
                        },
                        abort: function(){
                            if (xdr) {
                                xdr.abort();
                            }
                        }
                    };
                }
            });
    };

	jQuery.support.cors = true;

	$.ajax({
        dataType: 'json',
        type: 'GET',
        url: 'http://wimsharedlb-418672833.us-east-1.elb.amazonaws.com/arcgis/rest/services/NAWQA/tablesTest/MapServer/3/query?where=OBJECTID+%3E+0&text=&objectIds=&time=&geometry=&geometryType=esriGeometryEnvelope&inSR=&spatialRel=esriSpatialRelIntersects&relationParam=&outFields=*&returnGeometry=true&maxAllowableOffset=&geometryPrecision=&outSR=&returnIdsOnly=false&returnCountOnly=false&orderByFields=ConstituentType,DisplayName&groupByFieldsForStatistics=&outStatistics=&returnZ=false&returnM=false&gdbVersion=&returnDistinctValues=false&f=json',
        headers: {'Accept': '*/*'},
        success: function (data) {
        	constObj = data; 
            $.each(data.features, function(key, value) {
            	if (value.attributes.Constituent != null) {
            		if (value.attributes.ConstituentType == 'inorganic' && value.attributes.Tableorder == "Mappable") {
						$('#inorganicConstituentSelect')
		         			.append($("<option></option>")
		         			.attr(value.attributes)
		         			.text(value.attributes.DisplayName));
		         			//.attr({"value": value.attributes.Constituent, "description": value.attributes.Description})
		         		//$('#constitExp').html("Inorganic text<br/>*For " + value.attributes.DisplayName + ", " + value.attributes.Description);
		         		if (value.attributes.DisplayName == "Chloride") {
		         			$('#constitExp').html("<p>" + value.attributes.GenDescSmallChg + "<br/>" + 
								value.attributes.GenDescLargeChg + "</p>" +
								"<p>For " + value.attributes.DisplayName + ", " +
								value.attributes.Description_SmallChange + ", " + 
								value.attributes.Description_LargeChange + "</p>");
		         		}
            		} else if (value.attributes.ConstituentType == 'organic' && value.attributes.Tableorder == "Mappable") {
            		  	$('#organicConstituentSelect')
		         			.append($("<option></option>")
		         			.attr(value.attributes)
		         			.text(value.attributes.DisplayName));
		         			//.attr({"value": value.attributes.Constituent, "description": value.attributes.Description})
		         	}
	            	/*$('#constituentSelect')
	         			.append($("<option></option>")
	         			.attr(value.attributes)
	         			.text(value.attributes.DisplayName));
	         			//.attr({"value": value.attributes.Constituent, "description": value.attributes.Description})
	         		$('#constitExp').html("*"+value.attributes.Description);*/
	         	}
			});
			orgSel = $("#organicConstituentSelect");
			inorgSel = $("#inorganicConstituentSelect");
			inorgSel.val("Chloride");
			orgSel.hide();

		},
        error: function (error) {
            console.log("Error processing the JSON. The error is:" + error);
        }
    });

	// a popup is constructed below from the dijit.Popup class, which extends some addtional capability to the InfoWindowBase class.
	var popup = new esri.dijit.Popup({},dojo.create("div"));

	
	//IMPORANT: map object declared below. Basic parameters listed here. 
	//String referencing container id for the map is required (in this case, "map", in the parens immediately following constructor declaration).
	//Default basemap is set using "basemap" parameter. See API reference page, esri.map Constructor Detail section for parameter info. 
	//For template's sake, extent parameter has been set to contiguous US.
	//sliderStyle parameter has been commented out. Remove comments to get a large slider type zoom tool (be sure to fix CSS to prevent overlap with other UI elements)
	//infoWindow parameter sets what will be used as an infoWindow for a map click. 
	//If using FeatureLayer,an infoTemplate can be set in the parameters of the FeatureLayer constructor, which will automagically generate an infoWindow.	 
	map = new esri.Map("map", {
    	basemap: "topo",
		wrapAround180: true,
		extent: new esri.geometry.Extent({xmin:-14580516.019450117,ymin:2072972.2070934423,xmax:-5618427.327072154,ymax:7527518.54552217,spatialReference:{wkid:102100}}), 
		slider: true,
		sliderStyle: "small", //use "small" for compact version, "large" for long slider version
		logo:false,
		infoWindow: popup
	});
	
	//navToolbar constructor declared, which serves the extent navigator tool.
    navToolbar = new esri.toolbars.Navigation(map);
	
	//dojo.connect method (a common Dojo framework construction) used to call mapReady function. Fires when the first or base layer has been successfully added to the map.
    dojo.connect(map, "onLoad", mapReady);
	
	//basemapGallery constructor which serves the basemap selector tool. List of available basemaps can be customized. Here,default ArcGIS online basemaps are set to be available.
	var basemapGallery = new esri.dijit.BasemapGallery({
		showArcGISBasemaps: true,
		map: map
	}, "basemapGallery");
	basemapGallery.startup();
	
	dojo.connect(basemapGallery, "onLoad", function() {
		console.log('loaded basemapGallery')
		var basemapUpdate = dojo.connect(basemapGallery, "onSelectionChange", function() {
			if (basemapGallery.getSelected().id == "basemap_3") {
				$(".headerTab").show();
				dojo.disconnect(basemapGallery, basemapUpdate);
				$("#loadingScreen").hide();
			}
		});
		basemapGallery.select("basemap_3");
	});

	//basemapGallery error catcher
	dojo.connect(basemapGallery, "onError", function() {console.log("Basemap gallery failed")});
	
	//calls the executeSiteIdentifyTask function from a click on the map. 
	dojo.connect(map, "onClick", executeSiteIdentifyTask);
	//method to adjust symbol size for larger scales
	dojo.connect(map, "onExtentChange", function() {
		var symbolFactor = 1.5;
		if (map.getLevel() > 8) {
			renderer.infos[2].symbol.width = 45*symbolFactor;
			renderer.infos[2].symbol.height = 25*symbolFactor;
		} else {
			renderer.infos[2].symbol.width = 45;
			renderer.infos[2].symbol.height = 25;
		}
	});

	dojo.connect(dojo.byId("printButton"), "onclick", printMap);

	var defaultSymbol = null;

	var count = 2;

	renderer = new esri.renderer.UniqueValueRenderer(defaultSymbol, "network_centroids.P00940_Chloride");
	renderer2 = new esri.renderer.UniqueValueRenderer(defaultSymbol);

	orangeBigSymbol = new esri.symbol.PictureMarkerSymbol("http://wimcloud.usgs.gov/apps/NAWQATrends/src/images/orange_large.png", 45, 45);
	greenBigSymbol = new esri.symbol.PictureMarkerSymbol("http://wimcloud.usgs.gov/apps/NAWQATrends/src/images/green_large.png", 45, 45);
	noChangeSymbolSmall = new esri.symbol.PictureMarkerSymbol("http://wimcloud.usgs.gov/apps/NAWQATrends/src/images/no-change.png", 45, 25);
	noChangeSymbolLarge = new esri.symbol.PictureMarkerSymbol("http://wimcloud.usgs.gov/apps/NAWQATrends/src/images/no-change.png", 75, 40);
	orangeSmallSymbol = new esri.symbol.PictureMarkerSymbol("http://wimcloud.usgs.gov/apps/NAWQATrends/src/images/orange_small.png", 45, 25);
	greenSmallSymbol = new esri.symbol.PictureMarkerSymbol("http://wimcloud.usgs.gov/apps/NAWQATrends/src/images/green_small.png", 45, 25);
	blankSymbol = new esri.symbol.PictureMarkerSymbol("http://wimcloud.usgs.gov/apps/NAWQATrends/src/images/blank.png", 45, 25);
	noDataSymbol = new esri.symbol.PictureMarkerSymbol("http://wimcloud.usgs.gov/apps/NAWQATrends/src/images/no_data.png", 45, 25);

	renderer.addValue({
		value: "2", 
		symbol: orangeBigSymbol,
		label: "Relatively large increase"
	});
    renderer.addValue({
		value: "1", 
		symbol: orangeSmallSymbol,
		label: "Relatively small increase"
	});
    /*renderer.addValue({
    	value: "0", 
    	symbol: new esri.symbol.SimpleMarkerSymbol(esri.symbol.SimpleMarkerSymbol.STYLE_SQUARE, 4,
							new esri.symbol.SimpleLineSymbol(esri.symbol.SimpleLineSymbol.STYLE_SOLID,
							new dojo.Color([0,0,0]), 1),
							new dojo.Color([0,0,0,1])),
    	label: "No change"
    });*/
	renderer.addValue({
		value: "0",
		symbol: noChangeSymbolSmall,
		label: "No significant change"
	});
    renderer.addValue({
		value: "-1", 
		symbol: greenSmallSymbol,
		label: "Relatively small decrease"
	});
    renderer.addValue({
		value: "-2", 
		symbol: greenBigSymbol,
		label: "Relatively large decrease"
	});
	renderer.addValue({
		value: "null", 
		symbol: blankSymbol,
		label: " "
	});
	renderer.addValue({
		value: "-999", 
		symbol: noDataSymbol,
		label: "Trend data not available"
	});
	
	renderer2.addValue({
		value: "1", 
		symbol: orangeSmallSymbol,
		label: "Increase"
	});
    renderer2.addValue({
		value: "0",
		symbol: noChangeSymbolSmall,
		label: "No significant change"
	});
    renderer2.addValue({
		value: "-1", 
		symbol: greenSmallSymbol,
		label: "Decrease"
	});
	renderer2.addValue({
		value: "null", 
		symbol: blankSymbol,
		label: " "
	});
	renderer2.addValue({
		value: "-999", 
		symbol: noDataSymbol,
		label: "Trend data not available"
	});

	//This object contains all layer and their ArcGIS and Wim specific mapper properties (can do feature, wms and dynamic map layers)
	allLayers = {
			"Network Change" : {
				"url": "http://wimsharedlb-418672833.us-east-1.elb.amazonaws.com/arcgis/rest/services/NAWQA/tablesTest/MapServer/0",
				"arcOptions": {
					"opacity": 1,
					"visible": true,
					"outFields": "*",
					"mode": esri.layers.FeatureLayer.MODE_SNAPSHOT,
					"id": "networkLocations"
				},
				"wimOptions": {
					"type": "layer",
					"layerType": "agisFeature",
					"includeInLayerList": true,
					"renderer": renderer
				}
			}, "": {
				"wimOptions": {
					"type": "heading",
					"includeInLayerList": true
				}
			}, "____________________________": {
				"wimOptions": {
					"type": "heading",
					"includeInLayerList": true
				}
			}, "Network Boundary" : {
				"url": "http://wimsharedlb-418672833.us-east-1.elb.amazonaws.com/arcgis/rest/services/NAWQA/DChangeTestMap4/MapServer",
				"visibleLayers": [0],
				"arcOptions": {
					"opacity": 0.75,
					"visible": true,
					"id": "networks"
				},
				"wimOptions": {
					"type": "layer",
					"includeInLayerList": true,
					"includeLegend": false 
				}
			}, /*"Principal Aquifers" : {
				"url": "http://wimsharedlb-418672833.us-east-1.elb.amazonaws.com/arcgis/rest/services/NAWQA/DecadalMap/MapServer",
				"visibleLayers": [1],
				"arcOptions": {
					"opacity": 0.7,
					"visible": true
				},
				"wimOptions": {
					"type": "layer",
					"includeInLayerList": true,
					"esriLegendLabel": false
				}
			}, */"Principal Aquifers" : {
				"url": "http://nwis-mapper.s3.amazonaws.com/pr_aq/${level}/${row}/${col}.png",
				"arcOptions": {
					"id": "principalAquifers", 
					"visible": false,
					"opacity": 0.5
				},
				"wimOptions": {
					"type": "layer",
					"layerType": "webTiledLayer",
					"includeInLayerList": true,
					"includeLegend": false,
					"renderer": renderer
				}
			}
		};


	//this function fires after all layers have been added to map with the map.addLayers method above.
	//this function creates the legend element based on the legendLayers array which contains the relevant data for each layer. 
	dojo.connect(map,'onLayersAddResult',function(results){
		$("#legendDiv").hide();

		legend = new esri.dijit.Legend({
			map:map,
			autoUpdate: true,
			layerInfos:legendLayers
		},"legendDiv");
		legend.startup();
		
		$(".esriSimpleSliderIncrementButton").attr("title", "zoom in");
		$(".esriSimpleSliderDecrementButton").attr("title", "zoom out");
	
		//this counter to track first and last of items in legendLayers
		var i = 0;
		var lastItem = layersObject.length;
		//this forEach loop generates the checkbox toggles for each layer by looping through the legendLayers array (same way the legend element is generated). 
		dojo.forEach (layersObject, function(layer){
			
			var layerName = layer.title;
				
			if (layer.layer != "heading") {
				
				if (layer.toggleType == "radioParent"){
						
					var radioParentCheck = new dijit.form.CheckBox({
						name: "radioParentCheck" + layer.group,
						id: "radioParentCheck_" + layer.group,
						params: {group: layer.group},
						onChange: function(evt){
							var radChildLayers = [];
							var grp = this.params.group;
							dojo.forEach (layersObject, function (layer){
								if (grp == layer.group && layer.toggleType != "radioParent"  ){
									radChildLayers.push(layer.layer);
								}
							});
							if (!this.checked){
								dojo.forEach (radChildLayers, function (layer){
									layer.setVisibility(false);
								});	
								var divs = dojo.query("." + grp);
								for(var i = 0; i < divs.length; i++) {
									divs[i].style.display= "none";  
								}
							} 
							if (this.checked){
								var divs = dojo.query("." + grp);
								for(var i = 0; i < divs.length; i++) {
								    divs[i].style.display= "block"; 
								}
								dojo.forEach (radChildLayers, function (layer){
									if (dojo.byId("radioButton"+layer.id).checked) {
										layer.setVisibility(true);
									}
								});
							}
							//Check radio buttons in this group to see what's visible
							//jquery selector to get based on group name and then loop through
							/*var checkLayer = map.getLayer(this.value);
							checkLayer.setVisibility(!checkLayer.visible);
							this.checked = checkLayer.visible;	*/
						}
					});
					var toggleDiv = dojo.doc.createElement("div");			
					dojo.place(toggleDiv,dojo.byId("toggle"), "after" );
					dojo.place(radioParentCheck.domNode,toggleDiv,"first");
					dojo.setStyle(toggleDiv, "paddingLeft", "15px");
					if (i == 0) {
						dojo.setStyle(toggleDiv, "paddingBottom", "10px");
					} else if (i == lastItem) {
						dojo.setStyle(toggleDiv, "paddingTop", "10px");
					}
					var radioParentCheckLabel = dojo.create('label',{'for':radioParentCheck.name,innerHTML:layerName},radioParentCheck.domNode,"after");
					dojo.place("<br/>",radioParentCheckLabel,"after");

				} else if (layer.toggleType == "radio") {
						
					var radioButton = new dijit.form.RadioButton({
						name: layer.group,
						id: "radioButton" + layer.layer.id,
						value:layer.layer.id,
						checked:layer.layer.visible,
						params: {group: layer.group},
						onChange:function(evt){
							var radioLayer = map.getLayer(this.value);
							var parentID = "radioParentCheck_" + layer.group;
							(this.checked && dijit.byId(parentID).checked) ? radioLayer.setVisibility(true) : radioLayer.setVisibility(false);						
						}
					});
					var toggleDiv = dojo.doc.createElement("div");
					dojo.place(toggleDiv,dojo.byId("toggle"), "after" );
					dojo.place(radioButton.domNode,toggleDiv,"first");
					dojo.setAttr(toggleDiv, "class", radioButton.params.group);
					dojo.setStyle(toggleDiv, "paddingLeft", "25px");
					dojo.setStyle(toggleDiv, "display", "none");
					if (i == 0) {
						dojo.setStyle(toggleDiv, "paddingBottom", "10px");
					} else if (i == lastItem) {
						dojo.setStyle(toggleDiv, "paddingTop", "10px");
					}
					var radioLabel = dojo.create('label',{'for':radioButton.name,innerHTML:layerName},radioButton.domNode,"after");
					dojo.place("<br/>",radioLabel,"after");
					
				} else {
					
					var checkBox = new dijit.form.CheckBox({
						name:"checkBox" + layer.layer.id,
						value:layer.layer.id,
						checked:layer.layer.visible,
						onChange:function(evt){
							var checkLayer = map.getLayer(this.value);
							checkLayer.setVisibility(!checkLayer.visible);
							this.checked = checkLayer.visible;
							if (allLayers[layerName].wimOptions.includeLegend == true && allLayers[layerName].wimOptions.staticLegendOptions.hasStaticLegend == true) {
								if (checkLayer.visible) {
									$("#" + layer.layer.id + "Legend").show();
								} else {
									$("#" + layer.layer.id + "Legend").hide();
								}
								
							}				
						}
					});
					if (allLayers[layerName].wimOptions.zoomScale) {
						//create the holder for the checkbox and zoom icon
						var toggleDiv = dojo.doc.createElement("div");
						dojo.place(toggleDiv,dojo.byId("toggle"),"after");
						dojo.place(checkBox.domNode,toggleDiv,"first");
						var checkLabel = dojo.create('label',{'for':checkBox.name,innerHTML:layerName},checkBox.domNode,"after");
						var scale = allLayers[layerName].wimOptions.zoomScale;
						var zoomImage = dojo.doc.createElement("div");
						zoomImage.id = 'zoom' + layer.layer.id;
						zoomImage.innerHTML = '<img id="zoomImage" style="height: 18px;width: 18px" src="images/zoom.gif" />';
						dojo.connect(zoomImage, "click", function() {
							if (map.getScale() > scale) {
								map.setScale(scale);;
							}
						});
						dojo.place(zoomImage,toggleDiv,"last");
						dojo.setStyle(checkBox.domNode, "float", "left");
						dojo.setStyle(toggleDiv, "paddingLeft", "15px");
						dojo.setStyle(checkLabel, "float", "left");
						dojo.setStyle(toggleDiv, "paddingTop", "5px");
						dojo.setStyle(dojo.byId("zoomImage"), "paddingLeft", "10px");
						dojo.setStyle(toggleDiv, "height", "25px");
						if (i == 0) {
							dojo.setStyle(toggleDiv, "paddingBottom", "10px");
						} else if (i == lastItem) {
							dojo.setStyle(toggleDiv, "paddingTop", "10px");
						}
						dojo.place("<br/>",zoomImage,"after");
					} else {
						var toggleDiv = dojo.doc.createElement("div");
						dojo.place(toggleDiv,dojo.byId("toggle"),"after");
						dojo.place(checkBox.domNode,toggleDiv,"first");
						dojo.setStyle(toggleDiv, "paddingLeft", "15px");
						if (i == 0) {
							dojo.setStyle(toggleDiv, "paddingBottom", "10px");
						} else if (i == lastItem) {
							dojo.setStyle(toggleDiv, "paddingTop", "10px");
						}
						var checkLabel = dojo.create('label',{'for':checkBox.name,innerHTML:layerName},checkBox.domNode,"after");
						dojo.place("<br/>",checkLabel,"after");
					}
					
				}
			} else {
				var headingDiv = dojo.doc.createElement("div");
				headingDiv.innerHTML = layer.title;
				dojo.place(headingDiv,dojo.byId("toggle"),"after");
				dojo.setStyle(headingDiv, "paddingTop", "10px");
				dojo.setStyle(headingDiv, "dojo.Color", "#D3CFBA");
				if (i == 0) {
					dojo.setStyle(headingDiv, "paddingBottom", "10px");
				} else if (i == lastItem) {
					dojo.setStyle(headingDiv, "paddingTop", "10px");
				}
			}
			i++;
		});
		
		//function to handle styling adjustments to the esri legend dijit
		setTimeout(function(){
			$.each($('div[id^="legendDiv_"]'), function (index, item) {
				for (layer in allLayers) {
					if (layer == $('#'+item.id+' span').html()) {
						if (allLayers[layer].wimOptions.esriLegendLabel !== undefined && allLayers[layer].wimOptions.esriLegendLabel == false) {
							$('#'+item.id+' table.esriLegendLayerLabel').remove();
						}
					}
				}
			});
			$("#legendDiv").show();
		}, 1000);
		
	});
	
	addAllLayers();
	
	//OPTIONAL: the below remaining lines within the init function are for performing an identify task on a layer in the mapper. 
	// the following 7 lines establish an IdentifyParameters object(which is an argument for an identifyTask.execute method)and specifies the criteria used to identify features. 
	// the constructor of the identifyTask is especially important. the service URL there should match that of the layer from which you'd like to identify.
	identifyParams = new esri.tasks.IdentifyParameters();
    identifyParams.tolerance = 10;
    identifyParams.returnGeometry = true;
    identifyParams.maxAllowableOffset = 1000;
    identifyParams.layerOption = "LAYER_OPTION_ALL";
    identifyParams.width  = map.width;
    identifyParams.height = map.height;
    //identifyTask = new esri.tasks.IdentifyTask("http://wimsharedlb-418672833.us-east-1.elb.amazonaws.com/arcgis/rest/services/NAWQA/DecadalMap/MapServer");
    identifyTask = new esri.tasks.IdentifyTask(map.getLayer("networks").url);

    dojo.connect(map.getLayer("networkLocations"), "onClick", function(evt) {
    	
    	console.log('clicked a feature');	
    	var feature = evt.graphic;
		var attr = feature.attributes;

		if (dojo.byId("organicButton").checked) {
			select = dojo.byId("organicConstituentSelect");
		} else if (dojo.byId("inorganicButton").checked) {
			select = dojo.byId("inorganicConstituentSelect");
		}
		
		//var currentConst = organicConstituentSelect.selectedOptions[0].attributes.constituent.textContent;
		var currentConst = select[select.selectedIndex].attributes.constituent.textContent
		//var displayConst = organicConstituentSelect.selectedOptions[0].attributes.displayname.textContent;
		var displayConst = select[select.selectedIndex].attributes.displayname.textContent

		sucode4FeatureLinkZoom = attr["network_centroids.SUCode"];

		var attField;
		var mapFields = map.getLayer("networkLocations").fields;
		$.each(mapFields, function(index, value) {
			if (mapFields[index].name.toLowerCase().indexOf(select[select.selectedIndex].attributes.constituent.textContent.toLowerCase()) != -1) {
				attField = mapFields[index].name;
			}
		});

    	var template = new esri.InfoTemplate("Trends Info: ${tbl_Networks.SUCode}",
			"<b>Network type:</b> " + networkTypeFind(attr["network_centroids.NETWORK_TYPE"]) + "<br/>"+
			"<p><b>Description:</b> ${tbl_Networks.NetDescMedium}<br/><br/>" +
			"<b>Well type:</b></p>" +
			"<p><b>" + displayConst + "</b>: <span class='" + camelize(getValue(attr[attField])) + "'>" + getValue(attr[attField]) + "</span></p>" +
			"<br/><p><a id='infoWindowLink' href='javascript:linkClick()'>Zoom to Network</a></p>");

    	//var template = new esri.InfoTemplate("Trends Info","<p><a id='infoWindowLink' href='javascript:void(0)'>Zoom to Network</a></p>");
			
		//ties the above defined InfoTemplate to the feature result returned from a click event	
        
        feature.setInfoTemplate(template);

        map.infoWindow.setFeatures([feature]);

        map.infoWindow.show(evt.mapPoint);

        setCursorByID("mainDiv", "default");
        map.setCursor("default");

	});

	function networkTypeFind(networkType) {
    	var networkText;

    	if (networkType == "URB") {
    		networkText = "Urban land use network";
    	} else if (networkType == "SUS") {
    		networkText = "Major aquifer study";
    	} else if (networkType == "AG") {
    		networkText = "Agricultural land use network";
    	}

    	return networkText;
    }

	function setCursorByID(id,cursorStyle) {
	 	var elem;
		 if (document.getElementById &&
		    (elem=document.getElementById(id)) ) {
		  	if (elem.style) elem.style.cursor=cursorStyle;
		 }
	}

	function getValue(val) {
		var textValue = "";
		if (val !== undefined) {
			val = val.toString();
			switch (val) {
				case "-2":
					textValue = "large decrease";
					break;
				case "-1":
					textValue = "small decrease";
					break;
				case "0":
					textValue = "no change";
					break;
				case "1":
					textValue = "small increase";
					break;
				case "2":
					textValue = "large increase";
					break;
				default:
					textValue = "no data";
					break;
			}
		}
		return textValue;
	}

	function camelize(str) {
        return str.replace(/(?:^\w|[A-Z]|\b\w)/g, function(letter, index) {
            return index == 0 ? letter.toLowerCase() : letter.toUpperCase();
        }).replace(/\s+/g, '');
    }

	//OPTIONAL: the following function carries out an identify task query on a layer and returns attributes for the feature in an info window according to the 
	//InfoTemplate defined below. It is also possible to set a default info window on the layer declaration which will automatically display all the attributes 
	//for the layer in the order they come from the table schema. This code below creates custom labels for each field and substitutes in the value using the notation ${[FIELD NAME]}. 
    function executeSiteIdentifyTask(evt) {

    	map.graphics.clear();

    	identifyParams.geometry = evt.mapPoint;
        identifyParams.mapExtent = map.extent;
       
	    // the deferred variable is set to the parameters defined above and will be used later to build the contents of the infoWindow.
	    
        var deferredResult = identifyTask.execute(identifyParams);

        setCursorByID("mainDiv", "wait");
        map.setCursor("wait");

        //getAquifer(evt.mapPoint);

        deferredResult.addCallback(function(response) {     
            
            if (response.length > 0) {
            	var feature = response[0].feature;
            	var networkFeature = response[0].feature;
		        var attr = feature.attributes;
		        
				var featureLayer = map.getLayer("networkLocations");
				var sucode = attr.SUCODE;

				// Code for adding network highlight
				var symbol = new esri.symbol.SimpleFillSymbol(esri.symbol.SimpleFillSymbol.STYLE_SOLID, 
				    new esri.symbol.SimpleLineSymbol(esri.symbol.SimpleLineSymbol.STYLE_SOLID,
				    new dojo.Color([98,194,204]), 2), new dojo.Color([98,194,204,0.5])
				);
				feature.geometry.spatialReference = map.spatialReference;
				var graphic = feature;
				graphic.setSymbol(symbol);

				//map.graphics.add(graphic);

				// Begin query on networks centroid to get attributes for network popup
				var featureQuery = new esri.tasks.Query();
				featureQuery.returnGeometry = true;
				featureQuery.outFields = ["*"];
				featureQuery.where = "network_centroids.SUCode = '" + sucode + "'";

				featureLayer.queryFeatures(featureQuery, function(featureSet) {
					//set the customized template for displaying content in the info window. HTML tags can be used for styling.
					// The string before the comma within the parens immediately following the constructor sets the title of the info window.
		        	var attr = featureSet.features[0].attributes;

	        		//var currentConst = organicConstituentSelect.selectedOptions[0].attributes.constituent.textContent;
	        		//var displayConst = organicConstituentSelect.selectedOptions[0].attributes.displayname.textContent;

		        	var template = new esri.InfoTemplate("Trends Info: " + attr["tbl_Networks.SUCode"],
						"<b>Network type:</b> " + networkTypeFind(attr["network_centroids.NETWORK_TYPE"]) + "<br/>"+
						"<p><b>Description:</b> " + attr["tbl_Networks.NetDescMedium"] + "<br/><br/>" +
						"<b>Well type:</b></p>" +
						"<br/><p><a id='infoWindowLink' href='javascript:void(0)'>Zoom to Network</a></p>");
						
					//ties the above defined InfoTemplate to the feature result returned from a click event	
		            
		            feature.setInfoTemplate(template);

		            map.infoWindow.setFeatures([feature]);
		            map.infoWindow.show(evt.mapPoint);

		            var infoWindowClose = dojo.connect(map.infoWindow, "onHide", function(evt) {
		            	map.graphics.clear();
		            	dojo.disconnect(map.infoWindow, infoWindowClose);
		            });

		            setCursorByID("mainDiv", "default");
		            map.setCursor("default");

		            $("#infoWindowLink").click(function(feature) {
		            	var convertedGeom = esri.geometry.webMercatorToGeographic(networkFeature.geometry);

						var featExtent = convertedGeom.getExtent();
		            	
		            	map.setExtent(featExtent, true);
		            });

					//map.infoWindow.show(evt.mapPoint);

				}, function(error) {
					alert('error');
				});
				//var feature = featureSet.features[0];
        	} else {
        		var identifyParams2 = new esri.tasks.IdentifyParameters();
			    identifyParams2.tolerance = 0;
			    identifyParams2.returnGeometry = false;
			    identifyParams2.layerIds = [1];
			    identifyParams2.width  = map.width;
			    identifyParams2.height = map.height;
			    
			    var identifyTask2 = new esri.tasks.IdentifyTask("http://wimsharedlb-418672833.us-east-1.elb.amazonaws.com/arcgis/rest/services/NAWQA/DecadalMap/MapServer");

			    if (map.getLayer("principalAquifers").visible) {
			    	var deferredResult2 = identifyTask2.execute(identifyParams);

	        		deferredResult2.addCallback(function(response) {     

						if (response.length > 0) {
							var feature = response[0].feature;
			            	var attr = feature.attributes;
			            	console.log(attr["AQ_NAME"]);
			            	var features;

			            	var popInfo = "";
			            	var aqNameArray = [];

			            	for (var i = 0; i < response.length; i++) {
			            		//features.push(response[i].feature);
			            		var feature = response[i].feature;
				            	var attr = feature.attributes;
				            	if (aqNameArray.indexOf(attr["AQ_NAME"]) == -1) {
				            		aqNameArray.push(attr["AQ_NAME"]);
				            		popInfo += "<b>Aquifer:</b> " + attr["AQ_NAME"] +"<br/>";
				            	}	            	
				            }

							var template = new esri.InfoTemplate("Principal Aquifers",
								popInfo);
							
							//ties the above defined InfoTemplate to the feature result returned from a click event	
				            
				            feature.setInfoTemplate(template);

				            map.infoWindow.setFeatures([feature]);
				            map.infoWindow.show(evt.mapPoint);

				            var infoWindowClose = dojo.connect(map.infoWindow, "onHide", function(evt) {
				            	map.graphics.clear();
				            	dojo.disconnect(map.infoWindow, infoWindowClose);
				            });

				            setCursorByID("mainDiv", "default");
				            map.setCursor("default");
						}

					});
				} else {
					setCursorByID("mainDiv", "default");
				    map.setCursor("default");
				}
			    
			}

	    });

		//sets the content that informs the info window to the previously established "deferredResult" variable.
	    //map.infoWindow.setFeatures([ deferredResult ]);
		//tells the info window to render at the point where the user clicked. 
        //map.infoWindow.show(evt.mapPoint);
    }
	//end executeSiteIdentifyTask method

	
	  
	//Geocoder reference to geocoding services
    locator = new esri.tasks.Locator("http://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer");
	//calls the function that does the goeocoding logic (found in geocoder.js, an associated JS module)*
    dojo.connect(locator, "onAddressToLocationsComplete", showResults);
	
}
//end of init function	

//mapReady function that fires when the first or base layer has been successfully added to the map. Very useful in many situations. called above by this line: dojo.connect(map, "onLoad", mapReady)
function mapReady(map){ 	
	//Sets the globe button on the extent nav tool to reset extent to the initial extent.
	dijit.byId("extentSelector").set("initExtent", map.extent); 

	/*if (dojo.byId('disclaimer').children[1] != null) {
		dojo.byId('disclaimer').children[1].innerHTML = "<b>test</b>html";
		//if (configOptions.showDisclaimer == true) {
			var disclaimerNode = dojo.byId('disclaimer');
			
			var horCenter = dojo.style(document.body, "width") / 2;
			var vertCenter = dojo.style(document.body, "height") / 2;
			var disclaimerWidth = dojo.style(disclaimerNode, "width") / 2;
			var disclaimerHeight = dojo.style(disclaimerNode, "height") / 2;
			dojo.style(disclaimerNode, 'left', horCenter - disclaimerWidth + "px");
			dojo.style(disclaimerNode, 'top', vertCenter - disclaimerHeight + "px");
			dojo.style(disclaimerNode, 'visibility', 'visible');
		//}
	}*/
	
	//Create scale bar programmatically because there are some event listeners that can't be set until the map is created.
	//Just uses a simple div with id "latLngScaleBar" to contain it
	//var latLngBar = new wim.LatLngScale({map: map}, 'latLngScaleBar');
}

//function to iterate through allLayers array and build array for legend as well as array for adding services based on esri and wim specific options
function addAllLayers() {
		
	for (layer in allLayers) {
		if (allLayers[layer].wimOptions.type == "layer") {
			console.log(layer);
			var newLayer;
			if (allLayers[layer].wimOptions.layerType == "agisFeature") {
				newLayer = new esri.layers.FeatureLayer(allLayers[layer].url, allLayers[layer].arcOptions);
				if (allLayers[layer].wimOptions.renderer !== undefined) {
					newLayer.setRenderer(allLayers[layer].wimOptions.renderer);
				}
			} else if (allLayers[layer].wimOptions.layerType == "agisWMS") {
				newLayer = new esri.layers.WMSLayer(allLayers[layer].url, allLayers[layer].arcOptions);
				if (allLayers[layer].wimOptions.includeLegend == true && allLayers[layer].wimOptions.staticLegendOptions.hasStaticLegend == true) {
					var staticLegendImage = dojo.doc.createElement("div");
					staticLegendImage.id = allLayers[layer].arcOptions.id + 'Legend';
					staticLegendImage.innerHTML = '<b style="">' + allLayers[layer].wimOptions.staticLegendOptions.legendTitle + '</b><br/><img style="padding-top: 10px; width: ' + (parseInt($("#explanation").width())-25).toString() + 'px" src="' + allLayers[layer].wimOptions.staticLegendOptions.legendUrl + '" />';
					dojo.place(staticLegendImage,dojo.byId("legendDiv"),"after");
					if (allLayers[layer].arcOptions.visible == false) {
						$("#" + staticLegendImage.id).hide();
					}
				}
			} else if (allLayers[layer].wimOptions.layerType == "webTiledLayer") {
				newLayer = new esri.layers.WebTiledLayer(allLayers[layer].url, allLayers[layer].arcOptions);
			}  else {
				newLayer = new esri.layers.ArcGISDynamicMapServiceLayer(allLayers[layer].url, allLayers[layer].arcOptions);
				if (allLayers[layer].visibleLayers) {
					newLayer.setVisibleLayers(allLayers[layer].visibleLayers);
				}
			}
			
			//set wim options
			if (allLayers[layer].wimOptions) {
				if (allLayers[layer].wimOptions.includeInLayerList == true) {
					if (allLayers[layer].wimOptions.layerOptions && allLayers[layer].wimOptions.layerOptions.selectorType == "radio" ) {

						radioGroup = allLayers[layer].wimOptions.layerOptions.radioGroup;
						radioGroupArray.push({group: radioGroup, layer:newLayer});

						addToObjects({layer: newLayer, type:"layer", title: layer, toggleType: "radio", group: radioGroup}, allLayers[layer].wimOptions)
						
					} else {
						addToObjects({layer: newLayer, type:"layer", title: layer, toggleType: "checkbox", group: ""}, allLayers[layer].wimOptions)
					}
				} else if (allLayers[layer].wimOptions.includeInLayerList == false) {
					addToObjects({layer: newLayer, type:"layer", title: layer, toggleType: "checkbox", group: ""}, allLayers[layer].wimOptions)
				}
			} else {
				addToObjects({layer: newLayer, title: layer}, allLayers[layer].wimOptions)
			}
			layerArray.push(newLayer);
		} else if (allLayers[layer].wimOptions.type == "radioParent") {
			
			radioGroup = allLayers[layer].wimOptions.layerOptions.radioGroup;
			radioGroupArray.push({group: radioGroup, layer: null});
			
			layersObject.push({layer:null, type: "radioParent", title: layer, toggleType: "radioParent", group: radioGroup});
			
		} else {
			
			layersObject.push({layer: "heading", title: layer});
			
		}
	}
	
	map.addLayers(layerArray);
	
	function addToObjects(fullObject, wimOptions) {
		if (wimOptions.includeInLayerList != false) {
			layersObject.push(fullObject); 
		}
		if (wimOptions.includeLegend != false) {
			legendLayers.push(fullObject);
		}
	}
	
}

// USGS Logo click handler function
function showUSGSLinks(evt) {
	//check to see if there is already an existing linksDiv so that it is not build additional linksDiv. Unlikely to occur since the usgsLinks div is being destroyed on mouseleave.
	if (!dojo.byId('usgsLinks')){
		//create linksDiv
		var linksDiv = dojo.doc.createElement("div");
		linksDiv.id = 'usgsLinks';
		//LINKS BOX HEADER TITLE HERE
		linksDiv.innerHTML = '<div class="usgsLinksHeader"><b>USGS Links</b></div>';
		//USGS LINKS GO HERE
		linksDiv.innerHTML += '<p>';
		linksDiv.innerHTML += '<a style="dojo.Color:white" target="_blank" href="http://www.usgs.gov/">USGS Home</a><br />';
		linksDiv.innerHTML += '<a style="dojo.Color:white" target="_blank" href="http://www.usgs.gov/ask/">Contact USGS</a><br />';
		linksDiv.innerHTML += '<a style="dojo.Color:white" target="_blank" href="http://search.usgs.gov/">Search USGS</a><br />';
		linksDiv.innerHTML += '<a style="dojo.Color:white" target="_blank" href="http://www.usgs.gov/laws/accessibility.html">Accessibility</a><br />';
		linksDiv.innerHTML += '<a style="dojo.Color:white" target="_blank" href="http://www.usgs.gov/foia/">FOIA</a><br />';
		linksDiv.innerHTML += '<a style="dojo.Color:white" target="_blank" href="http://www.usgs.gov/laws/privacy.html">Privacy</a><br />';
		linksDiv.innerHTML += '<a style="dojo.Color:white" target="_blank" href="http://www.usgs.gov/laws/policies_notices.html">Policies and Notices</a></p>';
		
		//place the new div at the click point minus 5px so the mouse cursor is within the div
		linksDiv.style.top =  evt.clientY-5 + 'px';
		linksDiv.style.left = evt.clientX-5 + 'px';
		
		//add the div to the document
		dojo.byId('map').appendChild(linksDiv);
		//on mouse leave, call the removeLinks function
		dojo.connect(dojo.byId("usgsLinks"), "onmouseleave", removeLinks);
	}
}

function showHelpText(evt) {
	if (!dojo.byId('helpText')){

		map.infoWindow.hide();

		//create linksDiv 
		var helpTextDiv = dojo.doc.createElement("div");
		helpTextDiv.id = 'helpText';
		$("#helpText").addClass("ui-widget-content");
		//LINKS BOX HEADER TITLE HERE
		helpTextDiv.innerHTML = '<div id="helpTextInner">' +
			'<div id="helpTextHeaderClose">close</div>' +
		  	'<div id="helpTextHeader" class="usgsLinksHeader">Summary of Statistical Analysis of Decadal Change</div>' +
		  	'<div id="helpTextContent">' +
		  	'<p>Concentrations of key constituents analyzed between Cycle 1 (1988-2002) and Cycle 2 (2002-2012) of the NAWQA program.  Priority for analysis is based on:<br/>' + 
	        '(1) Constituents that exceeded a Maximum Contaminant Level or other human-health benchmark in more than 1 percent of public or domestic-supply wells (1,2,3)  <br/>' + 
	        '(2) Constituents that exceeded a Secondary Maximum Contaminant Level in more than 1 percent of public or domestic-supply wells (1,2,3);  or <br/>' + 
	        '(3) The five most frequently detected pesticides and VOCs (4,5);  or  <br/>' + 
	        '(4) Constituents of special or regional interest. <br/>' +

	        '<p><label class="tableTitle">Constituents meeting analysis criteria, results mapped</label>' +
          	'<table id="constTable" class="constTable">' +
	        '<tr><th>Constituent Name</th>' +
	        '<th>Constituent Class</th>' +
	        '<th>Benchmark</th>' +
	        '<th>Units</th>' +
	        '<th>Why Study?</th></tr>' +
	        '</table></p><br/>' +

	        '<p><label class="tableTitle">Constituents meeting analysis criteria, but not mapped: no decadal change</label>' +
          	'<table id="constTableNoChange" class="constTable">' +
	        '<tr><th>Constituent Name</th>' +
	        '<th>Constituent Class</th>' +
	        '<th>Benchmark</th>' +
	        '<th>Units</th>' +
	        '<th>Why Study?</th></tr>' +
	        '</table></p><br/>' +

	        '<p><label class="tableTitle">Constituents meeting analysis criteria, but not mapped: insufficient data</label>' +
          	'<table id="constTableInsuffData" class="constTable">' +
	        '<tr><th>Constituent Name</th>' +
	        '<th>Constituent Class</th>' +
	        '<th>Benchmark</th>' +
	        '<th>Units</th>' +
	        '<th>Why Study?</th></tr>' +
	        '</table></p><br/>' +
	        

	        '<p id="footnotes">1.  DeSimone, L.A., Hamilton, P.A., and Gilliom, R.J., 2009, Quality of Water from Domestic Wells in Principal Aquifers of the United States, 1991-2004 - Overview of Major Findings: Reston, VA, U.S. Geological Survey, p. 48 Circular' + 
	        '<br/>2.  Toccalino, P.L., and Hopple, J.A., 2010, The quality of our Nation’s waters-Quality of water from public-supply wells in the United States, 1993-2007-Overview of major findings, U.S. Geological Survey, p. 58 Circular' + 
	        '<br/>3.  Ayotte, J.D. Gronberg, J.M., and Apodaca, L.E., 2011, Trace Elements and Radon in Groundwater Across the United States: U.S. Geological Survey Scientific Investigations Report 2011-5059, 115 p.' + 
	        '<br/>4.  Zogorski, J.S., Carter, J.M., Ivahnenko, T., Lapham, W.W., Moran, M.J., Rowe, B.L., Squillace, P.J., and Toccalino, P.L., 2006, The Quality of our Nation\'s waters--Volatile Organic Compounds in the Nation\'s Ground Water and Drinking-Water Supply Wells: Reston, VA, U.S. Geological Survey, p. 101 Circular.' + 
	        '<br/>5.  Gilliom, R.J., Barbash, J.E., Crawford, C.G., Hamilton, P.A., Martin, J.D., Nakagaki, N., Nowell, L.H., Scott, J.C., Stackelberg, P.E., Thelin, G.P., and Wolock, D.M., 2006, The Quality of our Nation\'s Waters--Pesticides in the Nation\'s Streams and Ground Water, 1992-2001: Reston, VA, U.S. Geological Survey, p. 172 Circular.' + 
	        '<br/>6.  Toccalino, P.L., Gilliom, R.J., Lindsey, B.D., and Rupert, M.G., Pesticides in Groundwater of the United States: Decadal-Scale Changes, 1993-2011, 2014, Groundwater, DOI: 10.1111/gwat.12176' +
	        '<br/>7.  Lindsey, B.D., and Rupert, M.G., 2012, Methods for evaluating temporal groundwater quality data and results of decadal-scale changes in chloride, dissolved solids, and nitrate concentrations in groundwater in the United States, 1988–2010: U.S. Geological Survey Scientific Investigations Report 2012–5049, 46 p.</p></div>' +
	        '</div>';

		
		var percentOfScreenHeight = 0.8;
	    var percentOfScreenWidth = 0.8;

	    var top = (dojo.byId('map').style.height.replace(/\D/g,''))*((1.0-percentOfScreenHeight)/2) + "px";
	    var left = (dojo.byId('map').style.width.replace(/\D/g,''))*((1.0-percentOfScreenWidth)/2) + "px";
		
		helpTextDiv.style.top = top; //evt.clientY-5 + 'px';
		helpTextDiv.style.left = left; //evt.clientX-5 + 'px';
		
		helpTextDiv.style.height = (dojo.byId('map').style.height.replace(/\D/g,'')*percentOfScreenHeight) + "px";
		helpTextDiv.style.width = (dojo.byId('map').style.width.replace(/\D/g,'')*percentOfScreenWidth) + "px";

		//add the div to the document
		dojo.byId('map').appendChild(helpTextDiv);

		$("#constTable").append("<tr id='tableHeader'></tr>");
		var fields = ["DisplayName","ConstituentType","Benchmark","Units","WhyStudy"];

		$.each(constObj.features, function(key, value) {
	    	//alert("key: " + key + ", value: " + value);
	    	var id="const" + key;
	    	var tableType = constObj.features[key].attributes["Tableorder"];
	    	var table;
	    	if (tableType == "Mappable") {
	    		table = $("#constTable");
	    	} else if (tableType == "Not mapped, no decadal change") {
				table = $("#constTableNoChange");
	    	} else if (tableType == "Not mapped, not enough data") {
	    		table = $("#constTableInsuffData");
	    	}
	    	table.append("<tr id='" + id + "'></tr>");
	    	var feature = value;
	    	$.each(fields, function(key, field) {
	    		if (field == "Constituent") {
	    			$("#"+id).append("<td>"+feature.attributes[field].split('_')[0]+"</td>");
	    		} else {
					$("#"+id).append("<td>"+feature.attributes[field]+"</td>");
				}
	    	});
	    });

		var ht = $("#helpText").height() - $("#helpTextHeader").height() - 20;
	    $("#helpTextContent").height(ht + "px");

	    //on mouse leave, call the removeLinks function
		dojo.connect(dojo.byId("helpTextHeaderClose"), "onclick", removeHelpText);

	    $('#helpText').draggable({
		    start: function() {
		        // if we're scrolling, don't start and cancel drag
		        if ($(this).data("scrolled")) {
		            $(this).data("scrolled", false).trigger("mouseup");
		            return false;
		        }
		    }
		}).find("*").andSelf().scroll(function() {               
		    // bind to the scroll event on current elements, and all children.
		    //  we have to bind to all of them, because scroll doesn't propagate.

		    //set a scrolled data variable for any parents that are draggable, so they don't drag on scroll.
		    $(this).parents(".ui-draggable").data("scrolled", true);

		});
	    $('#helpText').resizable({
	    	resize: function(e, ui) {
         		var ht = $("#helpText").height() - $("#helpTextHeader").height() - 20;
	    		$("#helpTextContent").height(ht + "px");
        	}
	    });

		
	}
}

function showConstituentExp() {
	if ($("#constitExp").is(':visible') || $("#constitExp").css('display') == 'inline') {
		$("#constitExp").hide();
	} else {
		$("#constitExp").show();
	}
}

function populateConstitExp() {

}

//remove (destroy) the usgs Links div (called on mouseleave event)
function removeLinks(){
	dojo.destroy('usgsLinks');
}

function removeHelpText(){
	dojo.destroy('helpText');
}

function constTypeSelect(event) {
	
	var button = event.currentTarget;

	if (button.id == "organicButton") {
		$("#organicConstituentSelect").show();
		$("#inorganicConstituentSelect").hide();
		$("#organicConstituentSelect").prependTo("#inputs");
		$("#organicConstituentSelect").trigger("change");
	} else if (button.id == "inorganicButton") {
		$("#organicConstituentSelect").hide();		
		$("#inorganicConstituentSelect").show();
		$("#inorganicConstituentSelect").prependTo("#inputs");
		$("#inorganicConstituentSelect").trigger("change");
	}

}

function constituentUpdate(event) {

	z = z + 1;

	dojo.setStyle(constStatus.id, "color", "yellow");
	constStatus.innerHTML = "...Updating...";

	var select = event.target;

	var astText = "<p>" + (select[select.selectedIndex].attributes.gendescsmallchg.textContent).toString() + "<br/>" + 
				(select[select.selectedIndex].attributes.gendesclargechg.textContent).toString() + "</p>" +
				"<p>For " + (select[select.selectedIndex].attributes.displayname.textContent).toString() + ", " +
				(select[select.selectedIndex].attributes.description_smallchange.textContent).toString() + ", " + 
				(select[select.selectedIndex].attributes.description_largechange.textContent).toString() + "</p>";

	if (astText.match("No benchmark available") != null && astText.match("No benchmark available").length > 0) {
		astText = "<p>" + (select[select.selectedIndex].attributes.gendescsmallchg.textContent).toString() + "</p>";
	}

	if (select.id == "organicConstituentSelect") {
		$('#constitExp').html(astText);
	} else if (select.id == "inorganicConstituentSelect") {
		$('#constitExp').html(astText);
	}
	
	var featureLayer = map.getLayer("networkLocations");
    
	var layerUpdateEnd = dojo.connect(featureLayer, "onUpdateEnd", function (evt) {
			dojo.disconnect(featureLayer, layerUpdateEnd);
			constStatus.innerHTML = "Updated";
			dojo.setStyle(constStatus.id, "color", "green");
		});

	var defaultSymbol = null;

	var attField ="";
	var mapFields = map.getLayer("networkLocations").fields;
	$.each(mapFields, function(index, value) {
		if (mapFields[index].name.toLowerCase().indexOf(select[select.selectedIndex].attributes.constituent.textContent.toLowerCase()) != -1) {
			attField = mapFields[index].name;
		}
	});

	renderer.attributeField = attField;
	renderer2.attributeField = attField;
	
	if (astText.match("No benchmark available") != null && astText.match("No benchmark available").length > 0) {
		featureLayer.setRenderer(renderer2);
	} else {
		featureLayer.setRenderer(renderer);
	}

	featureLayer.refresh();
	legend.refresh();

}

function printMap() {

	var select;

	if (dojo.byId("organicButton").checked) {
		select = dojo.byId("organicConstituentSelect");
	} else if (dojo.byId("inorganicButton").checked) {
		select = dojo.byId("inorganicConstituentSelect");
	}

	var currConst = select[select.selectedIndex].attributes.displayname.textContent;

	var printParams = new esri.tasks.PrintParameters();
	printParams.map = map;

	var template = new esri.tasks.PrintTemplate();
	template.exportOptions = {
	  	width: 500,
		height: 400,
		dpi: 300
	};
	template.format = "PDF";
	template.layout = "Letter ANSI A Landscape";
	template.preserveScale = false;
	var legendLayer = new esri.tasks.LegendLayer();
	legendLayer.layerId = "networkLocations";
	//legendLayer.subLayerIds = [*];
	template.layoutOptions = {
		"titleText": "Decadal Change in " + currConst,
		"legendlayers": [legendLayer]
	};
	printParams.template = template;

	var printMap = new esri.tasks.PrintTask("http://wimsharedlb-418672833.us-east-1.elb.amazonaws.com/arcgis/rest/services/Utilities/PrintingTools/GPServer/Export%20Web%20Map%20Task");
	printMap.execute(printParams, printDone, printError);

	map.setCursor("wait");

	function printDone(event) {
		//alert(event.url);
		window.open(event.url, "_blank");
		map.setCursor("default");
	}

	function printError(event) {
		alert(event.error);
	}
}

function linkClick() {

	map.setCursor("wait");
	console.log(sucode4FeatureLinkZoom);
	var query = new esri.tasks.Query();
	query.where = "SUCODE = '" + sucode4FeatureLinkZoom + "'";
	query.returnGeometry = true;
	var queryTask = new esri.tasks.QueryTask(map.getLayer("networks").url+"/0");
	queryTask.execute(query, function (results) {
		console.log('returned with result?');
		var feature = results.features[0];
		var featureExtent = feature.geometry.getExtent();
		map.setExtent(featureExtent, true);
		//setCursorByID("mainDiv", "default");
        map.setCursor("default");
	});

}

dojo.ready(init);
//IMPORTANT: while easy to miss, this little line above makes everything work. it fires when the DOM is ready and all dojo.require calls have been resolved. 
//Also when all other JS has been parsed, as it lives here at the bottom of the document. Once all is parsed, the init function is executed*