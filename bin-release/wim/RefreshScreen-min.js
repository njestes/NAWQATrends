dojo.provide("wim.RefreshScreen"),dojo.require("dijit._Container"),dojo.require("dijit._TemplatedMixin"),dojo.require("dijit._WidgetBase"),dojo.declare("wim.RefreshScreen",[dijit._WidgetBase,dijit._Container,dijit._TemplatedMixin],{templatePath:dojo.moduleUrl("wim","templates/RefreshScreen.html"),baseClass:"refreshScreen",attachedMapID:null,constructor:function(){dojo.create("img",{id:"refreshScreenGraphic",src:"images/loading_black.gif"},dojo.byId("refreshScreen"))},postCreate:function(){dojo.style(this.id,"visibility","hidden")}});