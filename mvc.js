



/*
* can mixin this type to aid validation
*/ 
function InterfaceType(body) {
	body.implements = function(implementation) {
		for(prop in body) {
			if(body.hasOwnProperty(prop) && prop !== 'implements') {
				if(!implementation.hasOwnProperty(prop) 
					|| typeof implementation[prop] != typeof body[prop]) {
					return false;
				}
			}
		}
		return true;
	};
	
	return body;
}






/* view interface */
var iView = new InterfaceType({
	template : ''
});

/*
* oncreate, onrenderstart, onrenderend, onload
*/
var Views = {

	EventQueue : [],

	ViewType : function(body) {
		
		if(!iView.implements(body)) {
			throw "the body of the ViewType does not implement iView";
		}
		
		var _templater = new TemplaterFactory({ starttag : "<%", endtag : "%>"});
		
		//var _eventQueue = [];
		

		
		_fireQueuedEvents = function() {
			while(Views.EventQueue.length > 0) {
				Views.EventQueue.pop()();
			}
		};
		
		return function(model) {		
			
			
			_fireIfPresent = function(eventname, data) {
				if(body[eventname]) { body[eventname](data || model); }
			};
			
			_queueIfPresent = function(eventname, data) {
				if(body[eventname]) { 
					Views.EventQueue.push(function() {
						 body[eventname](data || model);
					});
				}
			};
			
			
			_fireIfPresent('oncreate');
			
			
			
			this.render = function(parent) {
			
				_fireIfPresent('onrenderstart');
			
				_queueIfPresent('onload');
				
				var html = _templater.tmpl(body.template, model || {});
				
				_fireIfPresent('onrenderend');		
				
				if(parent) {
					parent.innerHTML += html;
					
					_fireQueuedEvents();
				} 
				
				return html;
			};
		
		};
	}
}


function Model(body) {

	var _events = [];

	var _notify = function(property) {	
		if(_events[property]) {
			for(var i=0; i<_events[property].length; i++) {
				_events[property][i](body[property]);			
			}
		}	
	};
	
	this.get = function(property) {
		return body[property];
	};
	
	this.set = function(property, value) {
		body[property] = value;
		_notify(property);
	};
	
	this.onchange = function(property, handler) {
		if(!_events[property]) {
			_events[property] = [];
		}
		_events[property].push(handler);
	};
}