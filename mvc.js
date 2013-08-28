



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



var HtmlEntities = {
	// smoothing over the setting of values
	asSetter : function(domEl) {
		
		var action;
		
		if(domEl.value) {
		
			action = function(val) {
			
				domEl.value = val;
			};
		} else {
		
			action = function(val) {
			
				domEl.innerHTML = val;
			};
		}
		
		return {
		
			set : function(val) {
			
				action(val);
			}
		};
	},
	
	asPosition : function(domEl) {
	
		return {
		
			set : function(val) {
			
				domEl.style.left = val + 'px';
			}
		};
	}


};


var Helpers = {

	asValidatedInput : function(elementName, validateAction) {
	
		return function() {
		
			var el = document.getElementById(elementName);
			
			el.validate = function() { return validateAction(el.value); }
			
			return el;
		};
	}
	
	

};





/* view interface */
var iView = new InterfaceType({

	template : ''
});



var Bind = {

	to : function(modelFieldName) {
	
		return {
		
			as : function (modifier) {
				
				return function(model) {
				
					var self = this;
				
					// this function should be called using  
					//   func.call(body, model)  
					// to inject the 'this' var 
					self.onchange = function() {
						
						model.set(modelFieldName, this.value);
					};
					
					model.onchange(modelFieldName, function(newval) {
					
						modifier(self).set(newval);
					});						
				};
			}
		};
	}
};



var Data = {
	bind : function(elementName) {
		
		return {
		
			to : function(modelFieldName) {
			
				return {
				
					as : function (modifier) {
						
						return function(model) {
							// this function should be called using  
							//   func.call(body, model)  
							// to inject the 'this' var 
							this[elementName].onchange = function() {
								
								model.set(modelFieldName, this.value);
							};
							
							model.onchange(modelFieldName, function(newval) {
							
								modifier(this[elementName]).set(newval);
							});						
						};
					}
				};
			}
		};
	}
};















/*
* oncreate, onrenderstart, onrenderend, onload
*/
var Views = {

	EventQueue : [],
		
	FireQueuedEvents : function() {
	
		while(Views.EventQueue.length > 0) {
		
			(Views.EventQueue.shift())();
		}
	},
	
	
	ViewType : function(body) {
		
		if(!iView.implements(body)) {
		
			throw "the body of the ViewType does not implement iView";
		}

		var _templater = new TemplaterFactory({ starttag : "<%", endtag : "%>"});

		
		return function(model) {		
			
			
			_queueDomBindings = function() {
					// when everything is rendered populate the references to the 
					// html dom elements, and do databind
					for(el in body.define) {
					
						if(body.define && body.define.hasOwnProperty(el)) {
						
							Views.EventQueue.push((function(el) {
								
								// curry up the functionality which will be run and attach things
								return function() {
									
									// define the elements
									if(typeof body.define[el] === 'function') {
									
										body[el] = body.define[el]();
									} else {
										
										body[el] = document.getElementById(body.define[el]);
									}
									
									// bind them to change events
									if(body.dataBind && body.dataBind.hasOwnProperty(el)) {
									
										/*
										*  Bind.to('label').as(HtmlEntities.asPosition);
										*/
										body.dataBind[el].call(body[el], model);
									}
									
								}
								
							})(el));
						}
					}				
			};			
			
			_fireIfPresent = function(eventname, data) {
			
				if(body[eventname]) { body[eventname](body, data || model); }
			};
			
			_queueIfPresent = function(eventname, data) {
			
				if(body[eventname]) { 
				
					Views.EventQueue.push(function() {
					
						 body[eventname](body, data || model);
					});
				}
			};
			
			_queueDomBindings();
			
			_fireIfPresent('oncreate');
			
			this.render = function(parent) {
			
				_fireIfPresent('onrenderstart');
			
				_queueIfPresent('onload');
				
				var html = _templater.tmpl(body.template, model || {});
				
				_fireIfPresent('onrenderend');		
				
				if(parent) {
				
					parent.innerHTML += html;
					
					Views.FireQueuedEvents();
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