/*
 * turntable.fm Playlist Manager
 * https://github.com/gilbarbara/Turntable.fm-Playlists
 * https://chrome.google.com/webstore/detail/eimhdmlhdgmboegnmecdnfbmdmhdoool
 *
 * Date: 2011-08-21
 * Version: 0.961
 * Author: Gil Barbara <gilbarbara@gmail.com>
 * Copyright (C): 2011
 *
 *  This program is free software; you can redistribute it and/or modify
 *  it under the terms of the Attribution Non-Commercial Share Alike
 *  (cc by-nc-sa) License as published by the Creative Commons Corporation;
 *  either version 3 of the License, or (at your option) any later version.
 *  
 *  See http://creativecommons.org/licenses/by-nc-sa/3.0/legalcode for details.
 *
 *  This program is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 *  
 *
 * Playlist sorting hacked by Miles Lightwood of TeamTeamUSA m@teamteamusa.com (aka Steppin' Lazor of Great Minds Crew)
 *
 */

/*////////////////////
C L A S S E S
////////////////////*/

if (typeof(TFMPL) == "undefined") {
	TFMPL = {
		name: "Playlist Manager",
		version: "0.991",
		started: null,
		userData: false,
		lastSong: null,
		timer: null,
		showLog: false,
		playlists: {},
		dropboxTimer: false,
		dropboxNew: false,
		oauth_token: null,
		oauth_token_secret: null
	};
}

TFMPL.log = function(msg) {
	if (TFMPL.showLog) console.log(msg);
};

TFMPL.start = function() {
	TFMPL.log("start");
	this.started = true;
	this.storage.load();
	this.ui.init();
	this.dropbox.timer();
	
	this.timer = setInterval(function() {
		TFMPL.utils.songsCounter();
		if (turntable.playlist.sortableEnabled && Math.abs(TFMPL.playlists[$(".TFMPL").data("playlist")].songs.length - $(".TFMPL .song").length) > 1) {
			TFMPL.ui.load($(".TFMPL").data("playlist"));
		}
	}, 15 * 1000);
	
	$.tinysort.defaults.order = "asc";
};

TFMPL.playlist = {
	create: function(value) {
		TFMPL.log("playlist.create");
		if (!value) return TFMPL.log("fail");
		
		TFMPL.ui.cleanUp();
		var slug = TFMPL.utils.guid(TFMPL.utils.timestamp());
		TFMPL.playlists[slug] = {
			"name": value,
			"updated": TFMPL.utils.timestamp(),
			songs: []
		};
		TFMPL.storage.save();
		TFMPL.ui.menu(slug);
		TFMPL.ui.load(slug);
		
		return true;
	},
	update: function() {
		TFMPL.log("playlist.update");

		if ($(".TFMPL .song").length) {
			if (Math.abs(TFMPL.playlists[$(".TFMPL").data("playlist")].songs.length - $(".TFMPL .song").length) < 2) {
				var songs = [];
				$(".TFMPL .song").each(function() {
					songs.push($(this).data("songData").fileId)
				});
				TFMPL.playlists[$(".TFMPL").data("playlist")].songs = songs;
			} else {
				TFMPL.ui.load($(".TFMPL").data("playlist"));
			}
		}
		else {
			TFMPL.playlists[$(".TFMPL").data("playlist")].songs = [];
			TFMPL.ui.empty();
		}
		TFMPL.playlists[$(".TFMPL").data("playlist")].updated = TFMPL.utils.timestamp();
		TFMPL.storage.save();
		
		return true;
	},
	save: function(slug, newName) {
		if (!slug || !newName) return TFMPL.log("fail");
		
		TFMPL.playlists[slug].name = newName.replace(/'/g, "&#39;");
		TFMPL.storage.save();
		TFMPL.ui.menu();
		
		return true;
	},
	remove: function(slug) {
		TFMPL.log("playlist.remove");
		if (!slug) return TFMPL.log("fail");
		
		delete TFMPL.playlists[slug];
		TFMPL.storage.save();
		TFMPL.ui.menu();
		
		return true;
	}
};

TFMPL.ui = {
	init: function() {
		TFMPL.log("ui.init");
		
		if (!$("#TFMPL").length) {
			var winWidth = $(window).width(),
			    moveLeft = 1240,
			    topPos = 0;
			if(winWidth < 1030)
			{
			    moveLeft = 1000;
			    topPos = 65;
			}
			$("<div/>").
				attr("id", "TFMPL").
				addClass("playlist-container").
				css({ width: 256, top: topPos, left: Math.round((((winWidth - moveLeft)) / 2) + 10) }).appendTo("body");
				
			$("<div/>").
				addClass("black-right-header").
				html("<a href=\"\#\" class=\"icon\"></a><div class=\"header-text\">Playlists</div><a href=\"\#\" class=\"new\"></a><a href=\"\#\" class=\"settings\"></a><a href=\"\#\" class=\"info\"></a><a class=\"help\"></a>").
				appendTo("#TFMPL");
			
			$("<div/>").addClass("TFMPL_CONTENT").appendTo("#TFMPL");
			
			$("<div/>").
			addClass("TFMPL_MENU").appendTo(".TFMPL_CONTENT");
			
			$("<div/>").
				addClass("TFMPL queueView").
				droppable({
					activeClass: "activeClass",
					hoverClass: "hoverClass",
					accept: ".songlist .queue .song",
					tolerance: "pointer",
					activate: function() {
						$(".TFMPL .song").css({ opacity: 0.8 });
					},
					deactivate: function() {
						setTimeout("$(\".TFMPL .song\").css({ opacity: 1 });", 750);
						TFMPL.ui.load($(".TFMPL").data("playlist"));
					},
					drop: function( event, ui ) {
						TFMPL.ui.cleanUp();
						if (Math.abs(TFMPL.playlists[$(".TFMPL").data("playlist")].songs.length - $(".TFMPL .song").length) > 1) {
							TFMPL.ui.load($(".TFMPL").data("playlist"));
						}
						if (!$(".TFMPL .song:data('songData.fileId=" + ui.helper.data("songData").fileId + "')").length) {
							$(this).effect('highlight',{ color: "#008300" }, 1000);
							$this = ui.helper.clone(true).addSong().appendTo(this);
							$(".TFMPL .song").removeClass("nth-child-even").filter(":even").addClass("nth-child-even");
							TFMPL.playlist.update();
						} else {
							$(this).effect('highlight',{ color: "#FF0000" }, 1000);
						}
						if ($("#TFMPL dt .sort").width() == 0) $("#TFMPL dt .sort").animate({ width: 24 });
					}
				}).
				sortable({
					axis: "y",
					items: ".song",
					placeholder: "highlightClass",
					distance: 15,
					update: function(e,ui) {
						$(".TFMPL .song").removeClass("nth-child-even").filter(":even").addClass("nth-child-even");
						TFMPL.playlist.update();
					}
				}).
				appendTo(".TFMPL_CONTENT");
				$("#TFMPL").draggable({
					handle: ".black-right-header"
				});
				
				$("<div/>").attr("id", "sort_menu").html("<div data-sort=\"song\" data-order=\"asc\">sort by title</div><div data-sort=\"artist\" data-order=\"asc\">sort by artist</div><div data-sort=\"length\" data-order=\"asc\">sort by length</div><button>save</button>").appendTo("#TFMPL");
		}
		
		if (TFMPL.user.indicator) {
			setTimeout("TFMPL.ui.indicator();", 6000);
		}

		var newest = TFMPL.utils.newest();
		this.menu(newest);
		setTimeout(function() {
			if ($.cookie('TFMPLdropbox')) {
				var OAuth = $.cookie("TFMPLdropbox").split("&");
				TFMPL.oauth_token = OAuth[0];
				TFMPL.oauth_token_secret = OAuth[1];
				TFMPL.ui.settings("1");
				TFMPL.dropbox.callback();	
			}
			else if (TFMPL.userData) {
				TFMPL.ui.load(newest);
			}
		}, 4 * 1000);
		
		if (!newest) {
			$(".TFMPL").droppable("option", "disabled", true);
			if (!TFMPL.userData) {
				this.help();
			}
			else {
				this.create();
			}
		}
	},
	load: function(playlist) {
		TFMPL.log("ui.load");
		this.cleanUp();
		if (playlist && TFMPL.playlists[playlist]) {
			$(".TFMPL").html("").data("playlist", playlist);
			if (playlist) $(".TFMPL").droppable("option", "disabled", false);
			
			var songs = TFMPL.playlists[playlist].songs;
			if (songs.length) {
				for(var i in songs) {
					$(".realPlaylist .song:data('songData.fileId="+ songs[i] +"')").clone(true).addSong().appendTo(".TFMPL");
				}
				var title = (TFMPL.playlists[playlist].name.length > 19 ? TFMPL.playlists[playlist].name.substring(0, 18) + "..." : TFMPL.playlists[playlist].name);
				$("#TFMPL dt").html("<span class=\"sort\"></span><span class=\"title\">" + title + " (" + TFMPL.playlists[playlist].songs.length + ")</span>");
				if (TFMPL.playlists[playlist].songs.length) $("#TFMPL dt .sort").addClass("visible").animate({ width: 24 });
				$(".TFMPL .song").removeClass("nth-child-even").filter(":even").addClass("nth-child-even");
				$("#TFMPL .TFMPL").sortable("option", "disabled", false);
			}
			else {
				this.empty();
			}
			if (TFMPL.dropboxNew) {
				$("<div/>").addClass("dropboxNew").appendTo("#TFMPL").slideDown();
				$(".dropboxNew").click(function() {
					$(this).remove();
					TFMPL.ui.settings("1");
				});
				TFMPL.dropboxNew = false;
			}
		}
		else {
			this.create();
		}
	},
	sortPlaylist: function(attribute, orderRel) {
		TFMPL.log("ui.sortPlaylist");
		$(".TFMPL .song").tsort('',{ data: "songData", dataObj: "metadata", dataProperty: attribute, order: orderRel });
		$(".TFMPL .song").removeClass("nth-child-even").filter(":even").addClass("nth-child-even");
		return true;
	},
	menu: function(selected) {
		TFMPL.log("ui.menu");
		
		$menu = $("<dl/>").attr({ id: "TFMPL_MENU" }).addClass("dropdown");
		var title = (selected ? (TFMPL.playlists[selected].name.length > 19 ? TFMPL.playlists[selected].name.substring(0,18) + "..." : TFMPL.playlists[selected].name) : '');
		$menu.append("<dt data-playlist=\"" + selected + "\"><span class=\"sort\"></span><span class=\"title\">" + (selected ? title : "Playlists") + "</span></dt>");
		
		var loop = "<div class=\"TFMPL_WRAPPER\"><div class=\"TFMPL_PLAYLISTS\"><ul>";
		for(var i in TFMPL.playlists) {
			loop += "<li data-playlist=\"" + i + "\">" + TFMPL.playlists[i].name + " (" + TFMPL.playlists[i].songs.length + ")</li>";
		}
		
		loop += "</ul></div></div>";
		$menu.append("<dd>" + loop + "</dd>");
		$menu.find("ul li").tsort();
		$("#TFMPL .TFMPL_MENU").html($menu);
	},
	create: function() {
		TFMPL.log("ui.create");
		this.cleanUp("TFMPL_NEW");
		if (!$(".TFMPL_NEW:visible").length) {
			$("<div/>").addClass("TFMPL_NEW destroyable").html("<div>Add a new playlist</div><input type=\"text\"/><span>cancel</span>").appendTo("#TFMPL");
			$(".TFMPL_NEW input").populate("name");
			$(".TFMPL_NEW").slideDown(800, "easeOutBounce");
		}
	},
	info: function() {
		TFMPL.log("ui.info");
		this.cleanUp("TFMPL_INFO");
		if (!$(".TFMPL_INFO:visible").length) {
			$("<div/>").addClass("TFMPL_INFO destroyable").appendTo("#TFMPL");
			$("<div/>").addClass("subtitle").html("STATS").appendTo(".TFMPL_INFO");
			$("<div/>").addClass("block").html("<div class=\"number\">" + TFMPL.utils.totalPlaylists() + "</div><div class=\"text\">playlists<br/>&nbsp;</div>").appendTo(".TFMPL_INFO");
			$("<div/>").addClass("block").html("<div class=\"number\">" + TFMPL.utils.totalSongs() + "</div><div class=\"text\">songs in your playlists</div>").appendTo(".TFMPL_INFO");
			$("<div/>").addClass("block").html("<div class=\"number\">" + TFMPL.user.songsCount + "</div><div class=\"text\">songs played since install</div>").appendTo(".TFMPL_INFO");
			$("<div/>").addClass("block").html("<div class=\"number\">" + TFMPL.utils.totalQueue() + "</div><div class=\"text\">songs in your queue</div>").appendTo(".TFMPL_INFO");
			var install = new Date(TFMPL.user.created*1000);
			$("<div/>").addClass("installed").html("installed in " + (install.getMonth() < 9 ? "0" : "") + (install.getMonth() + 1) + "." + (install.getDay() < 9 ? "0" : "") + install.getDay() + "." + install.getFullYear()).appendTo(".TFMPL_INFO");
			$("<div/>").addClass("version").html("version: " + TFMPL.version).appendTo(".TFMPL_INFO");
			$("<div/>").addClass("links").html("site: <a href=\"https://chrome.google.com/webstore/detail/eimhdmlhdgmboegnmecdnfbmdmhdoool\" target=\"_blank\">Chrome Store</a>").appendTo(".TFMPL_INFO");
			$("<div/>").addClass("links").html("coder: <a href=\"http://twitter.com/gilbarbara\" target=\"_blank\">Gil Barbara</a>").appendTo(".TFMPL_INFO");
			$("<div/>").addClass("links").html("<br/><a href=\"https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=ZDRN38DYEALZ6\" target=\"_blank\"><img src=\"https://www.paypalobjects.com/en_US/i/btn/btn_donate_SM.gif\" border=\"0\"/></a>").appendTo(".TFMPL_INFO");
			
			
			$(".TFMPL_INFO").slideDown(800, "easeOutBounce");
		}
	},
	settings: function(selected) {
		TFMPL.log("ui.settings");
		this.cleanUp("TFMPL_SETTINGS");
		if (!$(".TFMPL_SETTINGS:visible").length) {
			$("<div/>").addClass("TFMPL_SETTINGS destroyable").appendTo("#TFMPL");
			$("<div/>").addClass("title").html("Settings").appendTo(".TFMPL_SETTINGS");
			$("<div/>").addClass("subtitle").html("<a href=\"\" class=\"mngPlsts\">Manage Playlists</a>").appendTo(".TFMPL_SETTINGS");
			$("<div/>").addClass("wrapper").appendTo(".TFMPL_SETTINGS");
			var fields = "";
			for( var i in TFMPL.playlists) {
				fields += "<div class=\"field\"><input data-slug=\"" + i + "\" data-value=\"" + TFMPL.playlists[i].name + "\" value=\"" + TFMPL.playlists[i].name + "\"/><a href=\"#\"></a><button>delete</button></div>";
			}
			$("<div/>").addClass("fields").html(fields).appendTo(".TFMPL_SETTINGS .wrapper");
			$(".TFMPL_SETTINGS .field").tsort(">input", { useVal:true });
			
			$("<div/>").addClass("tip").html("&bull; just type and press enter to save").appendTo(".TFMPL_SETTINGS .wrapper");
			$("<div/>").addClass("subtitle").html("<a href=\"#\" class=\"mngBckRstr\">Backup / Restore</a>").appendTo(".TFMPL_SETTINGS");			
			$("<div/>").addClass("backup_restore").html((TFMPL.user.token ? "<div class=\"dropbox on\"></div><div class=\"synced\"></div>" : "Automatic online sync<br/><div class=\"dropbox off\"></div>") + "<div id=\"dropbox\"></div><div class=\"dropbox_unlink" + (!TFMPL.user.token ? " off" : "") +"\"><button>delete - </button><a href=\"#\">unlink dropbox</a></div><br/>or you can copy/paste manually<br/><br/><strong>Back Up</strong><br/><textarea id=\"backup\">{\"playlists\":" + JSON.stringify(TFMPL.playlists) + ", \"preferences\":" + JSON.stringify(TFMPL.user) + "}</textarea><br/>copy this text and save it<br/><br/><strong>Restore</strong><br/><textarea id=\"restore\"></textarea><br/>paste your saved playlist and press enter<br/><span id=\"response\"></span><br/><br/>").appendTo(".TFMPL_SETTINGS");
			$("<div/>").addClass("indicator").html("<input type=\"checkbox\" value=\"1\"" + (TFMPL.user.indicator ? " checked" : "") +"/>Highlight unlisted songs").appendTo(".TFMPL_SETTINGS");
			
			if (TFMPL.user.lastSync) {
				var currentTime = new Date(TFMPL.user.lastSync * 1000);
				var minutes = currentTime.getMinutes();
				if (minutes < 10) minutes = "0" + minutes;
				$("#TFMPL .synced").html("Last sync: " + (currentTime.getMonth() + 1) + "/" + currentTime.getDate() + "/" + currentTime.getFullYear() + " " + currentTime.getHours() + ":" + minutes + (currentTime.getHours() > 11 ? " PM" : " AM"));
			}
			else {
				$("#TFMPL .synced").html("Last sync: never");
			}
			
			$(".TFMPL_SETTINGS").slideDown(800, "easeOutBounce");
			$(".TFMPL_SETTINGS").promise().done(function() {
				$(".TFMPL_SETTINGS .fields").jScrollPane({ hideFocus: true, verticalDragMinHeight: 16 }).animate({ opacity: 1});
				//$(".TFMPL_SETTINGS .wrapper").slideUp();
			});
			$("a.mngBckRstr").trigger("click");
		}
	},
	help: function() {
		TFMPL.log("ui.help");
		this.cleanUp("TFMPL_HELP");
		if (!$(".TFMPL_HELP:visible").length) {
			$("<div/>").addClass("TFMPL_HELP destroyable").appendTo("#TFMPL");
			$(".TFMPL_HELP").slideDown(800, "easeOutBounce");
		}
	},
	empty: function() {
		TFMPL.log("ui.empty");
		this.cleanUp();
		$("<div/>").addClass("TFMPL_EMPTY destroyable").appendTo("#TFMPL");
		$(".TFMPL_EMPTY").show();
	},
	indicator: function() {
		TFMPL.log("ui.indicator");
		var allSongs = TFMPL.utils.allSongs();

		$(".realPlaylist .song").each(function() {
			if ($.inArray($(this).data().songData.fileId, allSongs) == -1) {
				$(this).css("background-color", "#7EFB73");
			}
		});
	},
	cleanUp: function(except) {
		if ($(".TFMPL_WRAPPER").is(":visible")) $("#TFMPL dt").trigger("click");
		$("#TFMPL .destroyable").filter(function(index) {
			return ($(this).hasClass(except) ? false : true);
		}).remove();
	},
	refresh: function() {
		TFMPL.log("ui.refresh");
		if ($("#TFMPL").length) {
			$("#TFMPL").remove();
		}
		this.init();
	},
	destroy: function() {
		TFMPL.log("ui.destroy");
		$("#TFMPL").remove();
	}
};

TFMPL.dropbox = {
	init: function(request_auth) {
		TFMPL.log("dropbox.init");
		if (TFMPL.oauth_token) return true;
		return $.ajax({
			url: "https://query.yahooapis.com/v1/public/yql",
			type: "GET",
			async: true,
			jsonp: "callback",
			data: {
				env: "store://kollectiv.org/dropbox_OAuth",
				q: "SELECT * FROM dropbox WHERE uri = 'https://api.dropbox.com/0/oauth/request_token'",
				format: "json"
			},
			success: function(data){
				var response;
				var response = data.query.results.result;
				if (typeof(response) == "string") {
					var oAuthTokens = response.split("&");
					for (var key in oAuthTokens) {
						oAuthSplit = oAuthTokens[key].split("=");
						TFMPL[oAuthSplit[0]] = $.trim(oAuthSplit[1]);
					}
				} else {
					$("#dropbox").removeAttr("class").addClass('error').html(response.error).show();
				}
			},
			error: function(jqXHR, textStatus, errorThrown) {
				$("#dropbox").removeAttr("class").addClass('error').html(textStatus + " - " + errorThrown).show();
			},
			complete: function() {
				if (request_auth) {
					if (TFMPL.oauth_token) {
						$.cookie("TFMPLdropbox", TFMPL.oauth_token + "&" + TFMPL.oauth_token_secret, { path: '/' });
						location.href = "https://www.dropbox.com/0/oauth/authorize?oauth_token=" + TFMPL.oauth_token + "&oauth_callback="+location.href;
					}
					else {
						setTimeout(function() {
							$("#TFMPL #dropbox").removeAttr("class").addClass('error').html("trying again").show();
							$("#TFMPL .TFMPL_SETTINGS .dropbox.off").trigger("click");
						},2000);
					}
				}
			}
		}).responseText;
	},
	callback: function() {
		TFMPL.log("dropbox.callback");
		$("#dropbox").removeAttr("class").html("authorizing").show();
		return $.ajax({
			url: "https://query.yahooapis.com/v1/public/yql",
			type: "GET",
			jsonp: "callback",
			data: {
				env: "store://kollectiv.org/dropbox_OAuth",
				q: "SELECT * FROM dropbox WHERE uri = 'https://api.dropbox.com/0/oauth/access_token?oauth_token=" + TFMPL.oauth_token + "'",
				format: "json"
			},
			success: function(data) {
				var response = data.query.results.result;
				if (typeof(response) == "string") {
					var oAuthTokens = response.split("&");
					for (var key in oAuthTokens) {
						oAuthSplit = oAuthTokens[key].split("=");
						if(oAuthSplit[0] == "oauth_token") TFMPL.user.token = $.trim(oAuthSplit[1]);
						else TFMPL.user.tokenSecret = $.trim(oAuthSplit[1]);
					}
					if (TFMPL.user.token) {
						$("#dropbox").removeAttr("class").addClass("success").html("success").show();
						$("#TFMPL .dropbox").removeClass("off").addClass("on");
						TFMPL.storage.save();
						$.cookie("TFMPLdropbox", null);
						setTimeout(function() {
							$("#dropbox").removeAttr("class").addClass("success").html("success").show();
							TFMPL.dropbox.restore();
						}, 2000)
					}
				}
				else {
					$("#dropbox").removeAttr("class").addClass('error').html(response.error).show();
				}
			},
			error: function(jqXHR, textStatus, errorThrown) {
				$("#dropbox").removeAttr("class").html(textStatus + " - " + errorThrown).show();
			}
		}).responseText;
	},
	restore: function() {
		TFMPL.log("dropbox.restore");
		
		$("#dropbox").removeAttr("class").addClass("syncing").html("searching for backup").show();
		return $.ajax({
			url: "http://query.yahooapis.com/v1/public/yql",
			type: "GET",
			jsonp: "callback",
			data: {
				env: "store://kollectiv.org/dropbox_OAuth",
				q: 'SELECT * FROM dropbox WHERE uri = \'http://api-content.dropbox.com/0/files/dropbox/playlistsBkp.json\' AND token=\'' + TFMPL.user.token + '\' AND tokenSecret=\'' + TFMPL.user.tokenSecret + '\'',
				format: 'json'
			},
			success: function(data){
				var response = JSON.parse(data.query.results.result);
				if(response.error) {
					$("#dropbox").removeAttr("class").addClass('syncing').html("restore not found. let's sync!").show();
					TFMPL.dropbox.sync();
				} else {
					if(typeof(response) == "object") {
						$("#dropbox").removeAttr("class").addClass('success').html("backup restored!").show();
						TFMPL.playlists = response.playlists;
						if (TFMPL.user.token) response.preferences.token = TFMPL.user.token;
						if (TFMPL.user.tokenSecret) response.preferences.tokenSecret = TFMPL.user.tokenSecret;
						$.extend(TFMPL.user, response.preferences);
						TFMPL.userData = true;
						TFMPL.storage.save();
						var newest = TFMPL.utils.newest();
						TFMPL.ui.menu(newest);
					}
				}
			},
			error: function(jqXHR, textStatus,errorThrown) {
				$("#dropbox").removeAttr("class").addClass('error').html(textStatus + " - " + errorThrown).show();
			}
		});
	},
	sync: function(autoSync) {
		TFMPL.log("dropbox.sync");
		TFMPL.user.songsCount = TFMPL.utils.songsCounter();
		TFMPL.user.version = TFMPL.version;
		
		playlistsBkp = ('{"playlists":' + JSON.stringify(TFMPL.playlists) + ', "preferences":' + JSON.stringify(TFMPL.user) + '}').replace(/'/g, "&#39;");
		
		if (!autoSync || (autoSync && TFMPL.utils.newest(true) > TFMPL.user.lastSync)) {
			if (!$("#TFMPL .TFMPL_SETTINGS:visible").length) $("#TFMPL .black-right-header .icon").addClass('syncing');
			var request = $.ajax({
				url: "http://query.yahooapis.com/v1/public/yql",
				type: "POST",
				jsonp: "callback",
				data: {
					env: "store://kollectiv.org/dropbox_OAuth",
					q: 'SELECT * FROM dropbox WHERE uri = \'http://api-content.dropbox.com/0/files/dropbox?file=playlistsBkp.json\' AND token=\'' + TFMPL.user.token + '\' AND tokenSecret=\'' + TFMPL.user.tokenSecret + '\' AND playlist = \'' + playlistsBkp + '\' AND method = \'POST\'',
					format: 'json'
				},
				success: function(data){
					var response = JSON.parse(data.query.results.result);
					if(response.error) {
						if ($("#TFMPL .TFMPL_SETTINGS:visible").length) $("#dropbox").removeAttr("class").addClass('error').html(response.error).show();
					} else {
						if (response.result == "winner!") {
							TFMPL.user.lastSync = TFMPL.utils.timestamp();
							var currentTime = new Date();
							var minutes = currentTime.getMinutes();
							if (minutes < 10) minutes = "0" + minutes;
							if ($("#TFMPL .TFMPL_SETTINGS:visible").length) {
								$("#TFMPL .synced").html("Last sync: " + (currentTime.getMonth() + 1) + "/" + currentTime.getDate() + "/" + currentTime.getFullYear() + " " + currentTime.getHours() + ":" + minutes + (currentTime.getHours() > 11 ? " PM" : " AM"));
								$("#dropbox").removeAttr("class").addClass("success").html("sync completed").show();
							}
							else {
								$("#TFMPL .black-right-header .icon").removeClass('syncing');
							}
						}
					}
				},
				error: function(jqXHR, textStatus,errorThrown) {
					$("#dropbox").removeAttr("class").addClass('error').html(textStatus + " - " + errorThrown).show();
				}
			});
		}
		return request;
	},
	timer: function() {
		TFMPL.log("dropbox.timer");
		
		if(TFMPL.user.token) {
			TFMPL.log("starting timer");
			this.dropboxTimer = setInterval(function() {
				TFMPL.dropbox.sync(true);
			}, 60000);
		}
		
	}
};

TFMPL.storage = {
	support: function() {
		TFMPL.log("storage.support");
		try {
			return !!localStorage.getItem;
		} catch(e) {
			return false;
		}
	},
	save: function() {
		TFMPL.log("storage.save");
		
		TFMPL.user.songsCount = TFMPL.utils.songsCounter();
		TFMPL.user.version = TFMPL.version;
		localStorage.setItem("TFMPL", "{\"playlists\":" + JSON.stringify(TFMPL.playlists) + ", \"preferences\":" + JSON.stringify(TFMPL.user) + "}");
	},
	load: function() {
		TFMPL.log("storage.load");
		var storage = localStorage.getItem("TFMPL");
		if(storage !== "undefined" && storage !== null) {
			storage = JSON.parse(storage);
			TFMPL.playlists = storage.playlists;
			$.extend(TFMPL.user, storage.preferences);
			TFMPL.userData = true;
			
			//fixes
			if (TFMPL.user.version < 0.820) {
				TFMPL.user.songsCount = 0;
			}
			if (TFMPL.user.version < 0.952) {
				TFMPL.user.indicator = false;
				TFMPL.dropboxNew = true;
			}
		}
	},
	restore: function(string) {
		var restore = JSON.parse(string);
		if (typeof(restore) === "object") {
			TFMPL.user = restore.preferences;
			TFMPL.playlists = restore.playlists;
			TFMPL.ui.menu();
			this.save();
		}
		
		return (typeof(restore) === "object" ? "Restored successfully!" : "String not valid");
	},
	destroy: function() {
		TFMPL.log("storage.destroy");
		localStorage.setItem("TFMPL");
	}
};

TFMPL.utils = {
	guid: function(val) {
		TFMPL.log("utils.guid");
		var result = "", replaces = ["Oo", "Ll", "Rr", "Ee", "Aa", "Ss", "Gg", "Tt", "Bb", "Qq"];
		numbers = val.split("");
		for(var i in numbers) {
			capital = Math.floor(Math.random() * 2);
			result += replaces[numbers[i]][capital];
		}
		return result;
	},
	newest: function(time) {
		TFMPL.log("utils.newest");
		var largest = {
			key: null,
			val: null
		};
		for (var i in TFMPL.playlists) {
			if(TFMPL.playlists[i].updated>largest.val ){
				largest.key = i;
				largest.val = TFMPL.playlists[i].updated;
			}
		}
		return (time ? largest.val : largest.key);
	},
	size: function(obj) {
		TFMPL.log("utils.size");
		var size = 0, key;
		for (key in obj) {
			if (obj.hasOwnProperty(key)) size++;
		}
		return size;
	},
	allSongs: function() {
		TFMPL.log("utils.allSongs");
		var allSongs = [], key;
		for (key in TFMPL.playlists) {
			if (TFMPL.playlists[key].songs.length) {
				for(var i = 0;i<TFMPL.playlists[key].songs.length;i++) {
					allSongs.push(TFMPL.playlists[key].songs[i]);
				}
			}
		}
		return allSongs;
	},
	totalPlaylists: function() {
		TFMPL.log("utils.totalPlaylists");
		return this.size(TFMPL.playlists);
		
	},
	totalSongs: function(slug) {
		TFMPL.log("utils.totalSongs");
		var total = 0, key;
		if(slug) {
			total += TFMPL.playlists[slug].songs.length;
		}
		else {
			for (key in TFMPL.playlists) {
				total += TFMPL.playlists[key].songs.length;
			}
		}
		return total;
	},
	totalQueue: function() {
		TFMPL.log("utils.totalQueue");
		return $(".realPlaylist .song").length;
	},
	songsCounter: function() {
		if ($(".realPlaylist .currentSong").length) {
			if ($(".realPlaylist .currentSong").data("songData").fileId != TFMPL.lastSong) {
				TFMPL.lastSong = $(".realPlaylist .currentSong").data("songData").fileId;
				TFMPL.user.songsCount += + 1;
				TFMPL.storage.save();
			}
		}
		return TFMPL.user.songsCount;
	},
	timestamp: function() {
		return Math.round((new Date()).getTime() / 1000).toString();
	},
    nonce: function nonce(length) {
        var chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXTZabcdefghiklmnopqrstuvwxyz";
		length = (length ? length : 6);
        var result = "";
        for (var i = 0; i < length; ++i) {
            var rnum = Math.floor(Math.random() * chars.length);
            result += chars.substring(rnum, rnum+1);
        }
        return result;
    }
};

TFMPL.user = {
	userid: turntable.user.id,
	songsCount: 0,
	created: TFMPL.utils.timestamp(),
	indicator: false,
	version: this.version,
	token: null,
	tokenSecret: null,
	lastSync: null
};

/*////////////////////
A C T I O N S
////////////////////*/

/* Toolbar
-------------------- */

$("#TFMPL a.icon").live("click", function(e) {
	e.preventDefault();
	TFMPL.ui.load($("#TFMPL .TFMPL").data("playlist") ? $("#TFMPL .TFMPL").data("playlist") : TFMPL.utils.newest());
});

$("#TFMPL a.new").live("click", function(e) {
	e.preventDefault();
	if ($("#TFMPL .TFMPL_PLAYLISTS:visible").length) $("#TFMPL .dropdown dt .title").trigger("click");
	TFMPL.ui.create();
});

$("#TFMPL a.settings").live("click", function(e) {
	e.preventDefault();
	if ($("#TFMPL .TFMPL_PLAYLISTS:visible").length) $("#TFMPL .dropdown dt .title").trigger("click");
	TFMPL.ui.settings();
});

$("#TFMPL a.info").live("click", function(e) {
	e.preventDefault();
	if ($("#TFMPL .TFMPL_PLAYLISTS:visible").length) $("#TFMPL .dropdown dt .title").trigger("click");
	TFMPL.ui.info();
});

$("#TFMPL a.help").live("click", function(e) {
	e.preventDefault();
	if ($("#TFMPL .TFMPL_PLAYLISTS:visible").length) $("#TFMPL .dropdown dt .title").trigger("click");
	TFMPL.ui.help();
});

$("#TFMPL .black-right-header").live("dblclick", function() {
	$(".TFMPL_CONTENT").slideToggle();
});

/* Menu
-------------------- */

$("#TFMPL .dropdown dt .title").live("mouseover", function() {
	$("#TFMPL .dropdown dt").css({ backgroundColor: "#FABA43" });
}).live("mouseout", function() {
	$("#TFMPL .dropdown dt").css({ backgroundColor: "" });
}).live("click", function(e) {
	e.preventDefault();
	if (!$("#TFMPL .TFMPL_PLAYLISTS:visible").length) {
	    if ($("#TFMPL dt .sort").hasClass("visible")) $("#TFMPL dt .sort").animate({ width: 0 });
		$("#TFMPL #sort_menu").fadeOut();
		$(this).closest(".dropdown").find("dd .TFMPL_WRAPPER").animate({ height: "toggle" }, 800, "easeOutBounce");
	} else {
    	if ($("#TFMPL dt .sort").hasClass("visible")) $("#TFMPL dt .sort").animate({ width: 24 });
		$(this).closest(".dropdown").find("dd .TFMPL_WRAPPER").animate({ height: "toggle" });
	}
	$(this).promise().done(function() {
		if (!$("#TFMPL .TFMPL_PLAYLISTS").data("jsp")) $("#TFMPL .TFMPL_PLAYLISTS").jScrollPane({ hideFocus: true, verticalDragMinHeight: 16 });
	});
});
					
$("#TFMPL .dropdown dd ul li").live("click", function(e) {
	e.preventDefault();
	
	$this = $(this);
	var playlist = $this.data("playlist");
	
	if (playlist){
		if (TFMPL.playlists[playlist].songs.length) $("#TFMPL dt .sort").animate({ width: 24 });
		$this.closest(".dropdown").find("dt").data("playlist", $this.data("playlist")).end().find("dt .title").html($this.text()).end().find("dd .TFMPL_WRAPPER").hide();
		TFMPL.ui.load(playlist);
	}
});

/* Playlist
-------------------- */

$("#TFMPL .TFMPL .remove").live("click", function() {
	$(this).parent().remove();
	TFMPL.playlist.update();
});

$("#TFMPL dt .sort").live("click", function(e) {
    e.stopPropagation();
	if (!$(".TFMPL .song").length) TFMPL.ui.load($("#TFMPL dt").data("playlist"));
	$("#TFMPL #sort_menu").slideToggle();
});

$('#TFMPL #sort_menu').live("click", function(e){
	e.stopPropagation();
});

$("#TFMPL").live("click", function() {
	if($("#TFMPL #sort_menu:visible")) $("#TFMPL #sort_menu").slideUp();
});

$("#TFMPL #sort_menu div").live("click", function() {
	$("#TFMPL .TFMPL").sortable("option", "disabled", true);
	
	if($(this).data("order") == "desc") $(this).addClass("desc");
	else $(this).removeClass("desc");
	
	$(this).addClass("selected").siblings("div").removeClass("selected");
	TFMPL.ui.sortPlaylist($(this).data("sort"), $(this).data("order"));
	
	$(this).data("order", ($(this).data("order") == "asc" ? "desc" : "asc"));
});

$("#TFMPL #sort_menu button").live("click", function() {
	TFMPL.playlist.update();
	$("#TFMPL #sort_menu").slideUp();
	$("#TFMPL .TFMPL").sortable("option", "disabled", false);
});

/* New Playlist
-------------------- */

$("#TFMPL .TFMPL_NEW input").live("keydown", function(e) {
	var code = (e.keyCode ? e.keyCode : e.which);
	if(code == 13) TFMPL.playlist.create($(this).val());
});

$("#TFMPL .TFMPL_NEW span").live("click", function() {
	$(this).parent().remove();
	TFMPL.ui.load(TFMPL.utils.newest());
});

/* Settings
-------------------- */

$("#TFMPL .TFMPL_SETTINGS a.mngBckRstr").live("click", function(e) {
	e.preventDefault();
	$("#TFMPL .TFMPL_SETTINGS .backup_restore").slideDown();
	$("#TFMPL .TFMPL_SETTINGS .wrapper").slideUp();
});

$("#TFMPL .TFMPL_SETTINGS a.mngPlsts").live("click", function(e) {
	e.preventDefault();
	$("#TFMPL .TFMPL_SETTINGS .backup_restore").slideUp();
	$("#TFMPL .TFMPL_SETTINGS .wrapper").slideDown();
});

$("#TFMPL .TFMPL_SETTINGS #restore").live("keypress", function(e) {
	var code = (e.keyCode ? e.keyCode : e.which);
	if(code == 13) {
		e.preventDefault();
		$("#response").text(TFMPL.storage.restore($(this).val()));
	}
});

$("#TFMPL .TFMPL_SETTINGS .fields input").live("keydown", function(e) {
	var code = (e.keyCode ? e.keyCode : e.which);
	if(code == 13 && $(this).val() && ($(this).val() != $(this).data("value"))) {
		if (TFMPL.playlist.save($(this).data("slug"), $(this).val())) {
			$(this).data("value", $(this).val());
			$(this).effect("highlight", { color: "#FF0000" }, 1000);
			setTimeout(function() {
				$(".TFMPL_SETTINGS .field").tsort(">input", { useVal:true });
			}, 1000);
		}
	}
});

$("#TFMPL .TFMPL_SETTINGS .fields a").live("click", function(e) {
	e.preventDefault();
	$(this).siblings("button").toggle();
	$("#TFMPL .fields").data("jsp").reinitialise();
});

$("#TFMPL .TFMPL_SETTINGS .fields button").live("click", function(e) {
	e.preventDefault();
	$this = $(this);
	if (TFMPL.playlist.remove($this.siblings("input").data("slug"))) {
		$.when($this.parent().slideUp()).then(function() {
			$this.remove();
			$("#TFMPL .fields").data("jsp").reinitialise();
		});
	}
});

$("#TFMPL .TFMPL_SETTINGS .indicator input").live("click", function(e) {
	TFMPL.user.indicator = $(this).is(":checked");
	TFMPL.storage.save();
	if(!$(this).is(":checked")) {
		$(".realPlaylist .song").css("background-color", "");
	} else {
		TFMPL.ui.indicator();
	}
});

$("#TFMPL .TFMPL_SETTINGS .dropbox.off").live("click", function(e) {
	e.preventDefault();
	$("#TFMPL #dropbox").removeAttr("class").html("connecting to dropbox. wait").show();
	TFMPL.dropbox.init(true);
});

$("#TFMPL .TFMPL_SETTINGS .dropbox.on").live("click", function(e) {
	e.preventDefault();
	$("#TFMPL #dropbox").removeAttr("class").addClass('syncing').html("syncing").show();
	TFMPL.dropbox.sync();
});

$("#TFMPL .TFMPL_SETTINGS .dropbox_unlink a").live("click", function(e) {
	e.preventDefault();
	$("#TFMPL .TFMPL_SETTINGS .dropbox_unlink button").show();
});

$("#TFMPL .TFMPL_SETTINGS .dropbox_unlink button").live("click", function(e) {
	e.preventDefault();
	TFMPL.user.token = TFMPL.user.tokenSecret = TFMPL.user.lastSync = null;
	$("#TFMPL .dropbox").removeClass("on").addClass("off");
	$("#TFMPL .synced").hide();
	$("#TFMPL .dropbox_unlink").hide();
});



/* Start
-------------------- */

$().ready(function() {
	setTimeout(function() {
		if (!TFMPL.started) {
			TFMPL.start();
		}
	}, 2500);
});

$.fn.addSong = function () {
	return this.each(function () {
		$(this).css({ position: "", top: "", left: "", zIndex: "auto" }).removeData("draggable").removeData("sortableItem").removeClass("topSong ui-draggable").find(".inTFMPL").remove().end().find(".remove").unbind("click");
	});
};

/*////////////////////
P L U G I N S
////////////////////*/



(function($){
	var checkUndefined = function(a) {
		return typeof a === 'undefined';
	};
	$.expr[':'].data = function(elem, counter, params){
		if(checkUndefined(elem) || checkUndefined(params)) return false;
		var query = params[3];
		if(!query) return false; 
		var querySplitted = query.split('=');
		var selectType = querySplitted[0].charAt( querySplitted[0].length-1 );
		if(selectType == '^' || selectType == '$' || selectType == '!' || selectType == '*'){
			querySplitted[0] = querySplitted[0].substring(0, querySplitted[0].length-1);
			if(!$.stringQuery && selectType != '!'){
				return false;
			}
		}
		else selectType = '=';
		var dataName = querySplitted[0]; 
		var dataNameSplitted = dataName.split('.');
		var data = $(elem).data(dataNameSplitted[0]);
		if(checkUndefined(data)) return false;
		if(dataNameSplitted[1]){
			for(i=1, x=dataNameSplitted.length; i<x; i++){ 
				data = data[dataNameSplitted[i]];
				if(checkUndefined(data)) return false;
			}
		}
		if(querySplitted[1]){ 
			var checkAgainst = (data+'');
			switch(selectType){
				case '=': 
					return checkAgainst == querySplitted[1]; 
				break;
				case '!': 
					return checkAgainst != querySplitted[1];
				break;
				case '^': 
					return $.stringQuery.startsWith(checkAgainst, querySplitted[1]);
				break;
				case '$': 
					return $.stringQuery.endsWith(checkAgainst, querySplitted[1]);
				break;
				case '*': 
					return $.stringQuery.contains(checkAgainst, querySplitted[1]);
				break;
				default: 
					return false;
				break;
			}			
		}
		else{
			return true;
		}
	}
})(jQuery);

$.fn.populate = function (value) {
	return this.each(function() {
		var el = $(this);
		if($.trim(el.val()) == "") {
			el.val(value);
		}
		el.focus(function() {
			if(el.val() == value) {
				el.val("");
			}
		})
		.blur(function() {
			if($.trim(el.val()) == "") {
				el.val(value);
			}
		});
	});
};

/**
 * jQuery Cookie plugin
 *
 * Copyright (c) 2010 Klaus Hartl (stilbuero.de)
 * Dual licensed under the MIT and GPL licenses:
 * http://www.opensource.org/licenses/mit-license.php
 * http://www.gnu.org/licenses/gpl.html
 */
jQuery.cookie = function (key, value, options) {
    
    // key and at least value given, set cookie...
    if (arguments.length > 1 && String(value) !== "[object Object]") {
        options = jQuery.extend({}, options);

        if (value === null || value === undefined) {
            options.expires = -1;
        }

        if (typeof options.expires === 'number') {
            var days = options.expires, t = options.expires = new Date();
            t.setDate(t.getDate() + days);
        }
        
        value = String(value);
        
        return (document.cookie = [
            encodeURIComponent(key), '=',
            options.raw ? value : encodeURIComponent(value),
            options.expires ? '; expires=' + options.expires.toUTCString() : '', // use expires attribute, max-age is not supported by IE
            options.path ? '; path=' + options.path : '',
            options.domain ? '; domain=' + options.domain : '',
            options.secure ? '; secure' : ''
        ].join(''));
    }

    // key and possibly options given, get cookie...
    options = value || {};
    var result, decode = options.raw ? function (s) { return s; } : decodeURIComponent;
    return (result = new RegExp('(?:^|; )' + encodeURIComponent(key) + '=([^;]*)').exec(document.cookie)) ? decode(result[1]) : null;
};

/*
* jQuery TinySort - A plugin to sort child nodes by (sub) contents or attributes.
*
* Version: 1.1.0a
*
* Copyright (c) 2008-2011 Ron Valstar http://www.sjeiti.com/
*
* Dual licensed under the MIT and GPL licenses:
*   http://www.opensource.org/licenses/mit-license.php
*   http://www.gnu.org/licenses/gpl.html
*/
(function(b){b.tinysort={id:"TinySort",version:"1.1.0",copyright:"Copyright (c) 2008-2011 Ron Valstar",uri:"http://tinysort.sjeiti.com/",defaults:{order:"asc",attr:null,useVal:false,data:null,dataObj:null,dataProperty:null,place:"start",returns:false,cases:false,sortFunction:null}};b.fn.extend({tinysort:function(h,d){if(h&&typeof(h)!="string"){d=h;h=null}var j=b.extend({},b.tinysort.defaults,d);if(!j.sortFunction){j.sortFunction=j.order=="rand"?function(){return Math.random()<0.5?1:-1}:function(z,w){var i=!j.cases&&z.s&&z.s.toLowerCase?z.s.toLowerCase():z.s;var A=!j.cases&&w.s&&w.s.toLowerCase?w.s.toLowerCase():w.s;if(c(z.s)&&c(w.s)){i=parseFloat(z.s);A=parseFloat(w.s)}return(j.order=="asc"?1:-1)*(i<A?-1:(i>A?1:0))}}var u={};var l=!(!h||h=="");var m=!(j.attr===null||j.attr=="");var q=j.data!==null;var e=l&&h[0]==":";var f=e?this.filter(h):this;this.each(function(x){var y=b(this);var A=l?(e?f.filter(this):y.find(h)):y;var z=q?A.data(j.data)[j.dataObj][j.dataProperty]:(m?A.attr(j.attr):(j.useVal?A.val():A.text()));var w=y.parent();if(!u[w]){u[w]={s:[],n:[]}}if(A.length>0){u[w].s.push({s:z,e:y,n:x})}else{u[w].n.push({e:y,n:x})}});for(var n in u){var r=u[n];r.s.sort(j.sortFunction)}var g=[];for(var n in u){var r=u[n];var s=[];var v=b(this).length;switch(j.place){case"first":b.each(r.s,function(w,x){v=Math.min(v,x.n)});break;case"org":b.each(r.s,function(w,x){s.push(x.n)});break;case"end":v=r.n.length;break;default:v=0}var p=[0,0];for(var t=0;t<b(this).length;t++){var k=t>=v&&t<v+r.s.length;if(a(s,t)){k=true}var o=(k?r.s:r.n)[p[k?0:1]].e;o.parent().append(o);if(k||!j.returns){g.push(o.get(0))}p[k?0:1]++}}return this.pushStack(g)}});function c(e){var d=/^\s*?[\+-]?(\d*\.?\d*?)\s*?$/.exec(e);return d&&d.length>0?d[1]:false}function a(e,f){var d=false;b.each(e,function(h,g){if(!d){d=g==f}});return d}b.fn.TinySort=b.fn.Tinysort=b.fn.tsort=b.fn.tinysort})(jQuery);

/*! Copyright (c) 2010 Brandon Aaron (http://brandonaaron.net)
 * Licensed under the MIT License (LICENSE.txt).
 *
 * Thanks to: http://adomas.org/javascript-mouse-wheel/ for some pointers.
 * Thanks to: Mathias Bank(http://www.mathias-bank.de) for a scope bug fix.
 * Thanks to: Seamus Leahy for adding deltaX and deltaY
 *
 * Version: 3.0.4
 * 
 * Requires: 1.2.2+
 */

(function($) {

var types = ['DOMMouseScroll', 'mousewheel'];

$.event.special.mousewheel = {
    setup: function() {
        if ( this.addEventListener ) {
            for ( var i=types.length; i; ) {
                this.addEventListener( types[--i], handler, false );
            }
        } else {
            this.onmousewheel = handler;
        }
    },
    
    teardown: function() {
        if ( this.removeEventListener ) {
            for ( var i=types.length; i; ) {
                this.removeEventListener( types[--i], handler, false );
            }
        } else {
            this.onmousewheel = null;
        }
    }
};

$.fn.extend({
    mousewheel: function(fn) {
        return fn ? this.bind("mousewheel", fn) : this.trigger("mousewheel");
    },
    
    unmousewheel: function(fn) {
        return this.unbind("mousewheel", fn);
    }
});


function handler(event) {
    var orgEvent = event || window.event, args = [].slice.call( arguments, 1 ), delta = 0, returnValue = true, deltaX = 0, deltaY = 0;
    event = $.event.fix(orgEvent);
    event.type = "mousewheel";
    
    // Old school scrollwheel delta
    if ( event.wheelDelta ) { delta = event.wheelDelta/120; }
    if ( event.detail     ) { delta = -event.detail/3; }
    
    // New school multidimensional scroll (touchpads) deltas
    deltaY = delta;
    
    // Gecko
    if ( orgEvent.axis !== undefined && orgEvent.axis === orgEvent.HORIZONTAL_AXIS ) {
        deltaY = 0;
        deltaX = -1*delta;
    }
    
    // Webkit
    if ( orgEvent.wheelDeltaY !== undefined ) { deltaY = orgEvent.wheelDeltaY/120; }
    if ( orgEvent.wheelDeltaX !== undefined ) { deltaX = -1*orgEvent.wheelDeltaX/120; }
    
    // Add event and delta to the front of the arguments
    args.unshift(event, delta, deltaX, deltaY);
    
    return $.event.handle.apply(this, args);
}

})(jQuery);

/*
 * jScrollPane - v2.0.0beta11 - 2011-06-11
 * http://jscrollpane.kelvinluck.com/
 *
 * Copyright (c) 2010 Kelvin Luck
 * Dual licensed under the MIT and GPL licenses.
 */
(function(b,a,c){b.fn.jScrollPane=function(e){function d(D,O){var az,Q=this,Y,ak,v,am,T,Z,y,q,aA,aF,av,i,I,h,j,aa,U,aq,X,t,A,ar,af,an,G,l,au,ay,x,aw,aI,f,L,aj=true,P=true,aH=false,k=false,ap=D.clone(false,false).empty(),ac=b.fn.mwheelIntent?"mwheelIntent.jsp":"mousewheel.jsp";aI=D.css("paddingTop")+" "+D.css("paddingRight")+" "+D.css("paddingBottom")+" "+D.css("paddingLeft");f=(parseInt(D.css("paddingLeft"),10)||0)+(parseInt(D.css("paddingRight"),10)||0);function at(aR){var aM,aO,aN,aK,aJ,aQ,aP=false,aL=false;az=aR;if(Y===c){aJ=D.scrollTop();aQ=D.scrollLeft();D.css({overflow:"hidden",padding:0});ak=D.innerWidth()+f;v=D.innerHeight();D.width(ak);Y=b('<div class="jspPane" />').css("padding",aI).append(D.children());am=b('<div class="jspContainer" />').css({width:ak+"px",height:v+"px"}).append(Y).appendTo(D)}else{D.css("width","");aP=az.stickToBottom&&K();aL=az.stickToRight&&B();aK=D.innerWidth()+f!=ak||D.outerHeight()!=v;if(aK){ak=D.innerWidth()+f;v=D.innerHeight();am.css({width:ak+"px",height:v+"px"})}if(!aK&&L==T&&Y.outerHeight()==Z){D.width(ak);return}L=T;Y.css("width","");D.width(ak);am.find(">.jspVerticalBar,>.jspHorizontalBar").remove().end()}Y.css("overflow","auto");if(aR.contentWidth){T=aR.contentWidth}else{T=Y[0].scrollWidth}Z=Y[0].scrollHeight;Y.css("overflow","");y=T/ak;q=Z/v;aA=q>1;aF=y>1;if(!(aF||aA)){D.removeClass("jspScrollable");Y.css({top:0,width:am.width()-f});n();E();R();w();ai()}else{D.addClass("jspScrollable");aM=az.maintainPosition&&(I||aa);if(aM){aO=aD();aN=aB()}aG();z();F();if(aM){N(aL?(T-ak):aO,false);M(aP?(Z-v):aN,false)}J();ag();ao();if(az.enableKeyboardNavigation){S()}if(az.clickOnTrack){p()}C();if(az.hijackInternalLinks){m()}}if(az.autoReinitialise&&!aw){aw=setInterval(function(){at(az)},az.autoReinitialiseDelay)}else{if(!az.autoReinitialise&&aw){clearInterval(aw)}}aJ&&D.scrollTop(0)&&M(aJ,false);aQ&&D.scrollLeft(0)&&N(aQ,false);D.trigger("jsp-initialised",[aF||aA])}function aG(){if(aA){am.append(b('<div class="jspVerticalBar" />').append(b('<div class="jspCap jspCapTop" />'),b('<div class="jspTrack" />').append(b('<div class="jspDrag" />').append(b('<div class="jspDragTop" />'),b('<div class="jspDragBottom" />'))),b('<div class="jspCap jspCapBottom" />')));U=am.find(">.jspVerticalBar");aq=U.find(">.jspTrack");av=aq.find(">.jspDrag");if(az.showArrows){ar=b('<a class="jspArrow jspArrowUp" />').bind("mousedown.jsp",aE(0,-1)).bind("click.jsp",aC);af=b('<a class="jspArrow jspArrowDown" />').bind("mousedown.jsp",aE(0,1)).bind("click.jsp",aC);if(az.arrowScrollOnHover){ar.bind("mouseover.jsp",aE(0,-1,ar));af.bind("mouseover.jsp",aE(0,1,af))}al(aq,az.verticalArrowPositions,ar,af)}t=v;am.find(">.jspVerticalBar>.jspCap:visible,>.jspVerticalBar>.jspArrow").each(function(){t-=b(this).outerHeight()});av.hover(function(){av.addClass("jspHover")},function(){av.removeClass("jspHover")}).bind("mousedown.jsp",function(aJ){b("html").bind("dragstart.jsp selectstart.jsp",aC);av.addClass("jspActive");var s=aJ.pageY-av.position().top;b("html").bind("mousemove.jsp",function(aK){V(aK.pageY-s,false)}).bind("mouseup.jsp mouseleave.jsp",ax);return false});o()}}function o(){aq.height(t+"px");I=0;X=az.verticalGutter+aq.outerWidth();Y.width(ak-X-f);try{if(U.position().left===0){Y.css("margin-left",X+"px")}}catch(s){}}function z(){if(aF){am.append(b('<div class="jspHorizontalBar" />').append(b('<div class="jspCap jspCapLeft" />'),b('<div class="jspTrack" />').append(b('<div class="jspDrag" />').append(b('<div class="jspDragLeft" />'),b('<div class="jspDragRight" />'))),b('<div class="jspCap jspCapRight" />')));an=am.find(">.jspHorizontalBar");G=an.find(">.jspTrack");h=G.find(">.jspDrag");if(az.showArrows){ay=b('<a class="jspArrow jspArrowLeft" />').bind("mousedown.jsp",aE(-1,0)).bind("click.jsp",aC);x=b('<a class="jspArrow jspArrowRight" />').bind("mousedown.jsp",aE(1,0)).bind("click.jsp",aC);
if(az.arrowScrollOnHover){ay.bind("mouseover.jsp",aE(-1,0,ay));x.bind("mouseover.jsp",aE(1,0,x))}al(G,az.horizontalArrowPositions,ay,x)}h.hover(function(){h.addClass("jspHover")},function(){h.removeClass("jspHover")}).bind("mousedown.jsp",function(aJ){b("html").bind("dragstart.jsp selectstart.jsp",aC);h.addClass("jspActive");var s=aJ.pageX-h.position().left;b("html").bind("mousemove.jsp",function(aK){W(aK.pageX-s,false)}).bind("mouseup.jsp mouseleave.jsp",ax);return false});l=am.innerWidth();ah()}}function ah(){am.find(">.jspHorizontalBar>.jspCap:visible,>.jspHorizontalBar>.jspArrow").each(function(){l-=b(this).outerWidth()});G.width(l+"px");aa=0}function F(){if(aF&&aA){var aJ=G.outerHeight(),s=aq.outerWidth();t-=aJ;b(an).find(">.jspCap:visible,>.jspArrow").each(function(){l+=b(this).outerWidth()});l-=s;v-=s;ak-=aJ;G.parent().append(b('<div class="jspCorner" />').css("width",aJ+"px"));o();ah()}if(aF){Y.width((am.outerWidth()-f)+"px")}Z=Y.outerHeight();q=Z/v;if(aF){au=Math.ceil(1/y*l);if(au>az.horizontalDragMaxWidth){au=az.horizontalDragMaxWidth}else{if(au<az.horizontalDragMinWidth){au=az.horizontalDragMinWidth}}h.width(au+"px");j=l-au;ae(aa)}if(aA){A=Math.ceil(1/q*t);if(A>az.verticalDragMaxHeight){A=az.verticalDragMaxHeight}else{if(A<az.verticalDragMinHeight){A=az.verticalDragMinHeight}}av.height(A+"px");i=t-A;ad(I)}}function al(aK,aM,aJ,s){var aO="before",aL="after",aN;if(aM=="os"){aM=/Mac/.test(navigator.platform)?"after":"split"}if(aM==aO){aL=aM}else{if(aM==aL){aO=aM;aN=aJ;aJ=s;s=aN}}aK[aO](aJ)[aL](s)}function aE(aJ,s,aK){return function(){H(aJ,s,this,aK);this.blur();return false}}function H(aM,aL,aP,aO){aP=b(aP).addClass("jspActive");var aN,aK,aJ=true,s=function(){if(aM!==0){Q.scrollByX(aM*az.arrowButtonSpeed)}if(aL!==0){Q.scrollByY(aL*az.arrowButtonSpeed)}aK=setTimeout(s,aJ?az.initialDelay:az.arrowRepeatFreq);aJ=false};s();aN=aO?"mouseout.jsp":"mouseup.jsp";aO=aO||b("html");aO.bind(aN,function(){aP.removeClass("jspActive");aK&&clearTimeout(aK);aK=null;aO.unbind(aN)})}function p(){w();if(aA){aq.bind("mousedown.jsp",function(aO){if(aO.originalTarget===c||aO.originalTarget==aO.currentTarget){var aM=b(this),aP=aM.offset(),aN=aO.pageY-aP.top-I,aK,aJ=true,s=function(){var aS=aM.offset(),aT=aO.pageY-aS.top-A/2,aQ=v*az.scrollPagePercent,aR=i*aQ/(Z-v);if(aN<0){if(I-aR>aT){Q.scrollByY(-aQ)}else{V(aT)}}else{if(aN>0){if(I+aR<aT){Q.scrollByY(aQ)}else{V(aT)}}else{aL();return}}aK=setTimeout(s,aJ?az.initialDelay:az.trackClickRepeatFreq);aJ=false},aL=function(){aK&&clearTimeout(aK);aK=null;b(document).unbind("mouseup.jsp",aL)};s();b(document).bind("mouseup.jsp",aL);return false}})}if(aF){G.bind("mousedown.jsp",function(aO){if(aO.originalTarget===c||aO.originalTarget==aO.currentTarget){var aM=b(this),aP=aM.offset(),aN=aO.pageX-aP.left-aa,aK,aJ=true,s=function(){var aS=aM.offset(),aT=aO.pageX-aS.left-au/2,aQ=ak*az.scrollPagePercent,aR=j*aQ/(T-ak);if(aN<0){if(aa-aR>aT){Q.scrollByX(-aQ)}else{W(aT)}}else{if(aN>0){if(aa+aR<aT){Q.scrollByX(aQ)}else{W(aT)}}else{aL();return}}aK=setTimeout(s,aJ?az.initialDelay:az.trackClickRepeatFreq);aJ=false},aL=function(){aK&&clearTimeout(aK);aK=null;b(document).unbind("mouseup.jsp",aL)};s();b(document).bind("mouseup.jsp",aL);return false}})}}function w(){if(G){G.unbind("mousedown.jsp")}if(aq){aq.unbind("mousedown.jsp")}}function ax(){b("html").unbind("dragstart.jsp selectstart.jsp mousemove.jsp mouseup.jsp mouseleave.jsp");if(av){av.removeClass("jspActive")}if(h){h.removeClass("jspActive")}}function V(s,aJ){if(!aA){return}if(s<0){s=0}else{if(s>i){s=i}}if(aJ===c){aJ=az.animateScroll}if(aJ){Q.animate(av,"top",s,ad)}else{av.css("top",s);ad(s)}}function ad(aJ){if(aJ===c){aJ=av.position().top}am.scrollTop(0);I=aJ;var aM=I===0,aK=I==i,aL=aJ/i,s=-aL*(Z-v);if(aj!=aM||aH!=aK){aj=aM;aH=aK;D.trigger("jsp-arrow-change",[aj,aH,P,k])}u(aM,aK);Y.css("top",s);D.trigger("jsp-scroll-y",[-s,aM,aK]).trigger("scroll")}function W(aJ,s){if(!aF){return}if(aJ<0){aJ=0}else{if(aJ>j){aJ=j}}if(s===c){s=az.animateScroll}if(s){Q.animate(h,"left",aJ,ae)
}else{h.css("left",aJ);ae(aJ)}}function ae(aJ){if(aJ===c){aJ=h.position().left}am.scrollTop(0);aa=aJ;var aM=aa===0,aL=aa==j,aK=aJ/j,s=-aK*(T-ak);if(P!=aM||k!=aL){P=aM;k=aL;D.trigger("jsp-arrow-change",[aj,aH,P,k])}r(aM,aL);Y.css("left",s);D.trigger("jsp-scroll-x",[-s,aM,aL]).trigger("scroll")}function u(aJ,s){if(az.showArrows){ar[aJ?"addClass":"removeClass"]("jspDisabled");af[s?"addClass":"removeClass"]("jspDisabled")}}function r(aJ,s){if(az.showArrows){ay[aJ?"addClass":"removeClass"]("jspDisabled");x[s?"addClass":"removeClass"]("jspDisabled")}}function M(s,aJ){var aK=s/(Z-v);V(aK*i,aJ)}function N(aJ,s){var aK=aJ/(T-ak);W(aK*j,s)}function ab(aW,aR,aK){var aO,aL,aM,s=0,aV=0,aJ,aQ,aP,aT,aS,aU;try{aO=b(aW)}catch(aN){return}aL=aO.outerHeight();aM=aO.outerWidth();am.scrollTop(0);am.scrollLeft(0);while(!aO.is(".jspPane")){s+=aO.position().top;aV+=aO.position().left;aO=aO.offsetParent();if(/^body|html$/i.test(aO[0].nodeName)){return}}aJ=aB();aP=aJ+v;if(s<aJ||aR){aS=s-az.verticalGutter}else{if(s+aL>aP){aS=s-v+aL+az.verticalGutter}}if(aS){M(aS,aK)}aQ=aD();aT=aQ+ak;if(aV<aQ||aR){aU=aV-az.horizontalGutter}else{if(aV+aM>aT){aU=aV-ak+aM+az.horizontalGutter}}if(aU){N(aU,aK)}}function aD(){return -Y.position().left}function aB(){return -Y.position().top}function K(){var s=Z-v;return(s>20)&&(s-aB()<10)}function B(){var s=T-ak;return(s>20)&&(s-aD()<10)}function ag(){am.unbind(ac).bind(ac,function(aM,aN,aL,aJ){var aK=aa,s=I;Q.scrollBy(aL*az.mouseWheelSpeed,-aJ*az.mouseWheelSpeed,false);return aK==aa&&s==I})}function n(){am.unbind(ac)}function aC(){return false}function J(){Y.find(":input,a").unbind("focus.jsp").bind("focus.jsp",function(s){ab(s.target,false)})}function E(){Y.find(":input,a").unbind("focus.jsp")}function S(){var s,aJ,aL=[];aF&&aL.push(an[0]);aA&&aL.push(U[0]);Y.focus(function(){D.focus()});D.attr("tabindex",0).unbind("keydown.jsp keypress.jsp").bind("keydown.jsp",function(aO){if(aO.target!==this&&!(aL.length&&b(aO.target).closest(aL).length)){return}var aN=aa,aM=I;switch(aO.keyCode){case 40:case 38:case 34:case 32:case 33:case 39:case 37:s=aO.keyCode;aK();break;case 35:M(Z-v);s=null;break;case 36:M(0);s=null;break}aJ=aO.keyCode==s&&aN!=aa||aM!=I;return !aJ}).bind("keypress.jsp",function(aM){if(aM.keyCode==s){aK()}return !aJ});if(az.hideFocus){D.css("outline","none");if("hideFocus" in am[0]){D.attr("hideFocus",true)}}else{D.css("outline","");if("hideFocus" in am[0]){D.attr("hideFocus",false)}}function aK(){var aN=aa,aM=I;switch(s){case 40:Q.scrollByY(az.keyboardSpeed,false);break;case 38:Q.scrollByY(-az.keyboardSpeed,false);break;case 34:case 32:Q.scrollByY(v*az.scrollPagePercent,false);break;case 33:Q.scrollByY(-v*az.scrollPagePercent,false);break;case 39:Q.scrollByX(az.keyboardSpeed,false);break;case 37:Q.scrollByX(-az.keyboardSpeed,false);break}aJ=aN!=aa||aM!=I;return aJ}}function R(){D.attr("tabindex","-1").removeAttr("tabindex").unbind("keydown.jsp keypress.jsp")}function C(){if(location.hash&&location.hash.length>1){var aL,aJ,aK=escape(location.hash);try{aL=b(aK)}catch(s){return}if(aL.length&&Y.find(aK)){if(am.scrollTop()===0){aJ=setInterval(function(){if(am.scrollTop()>0){ab(aK,true);b(document).scrollTop(am.position().top);clearInterval(aJ)}},50)}else{ab(aK,true);b(document).scrollTop(am.position().top)}}}}function ai(){b("a.jspHijack").unbind("click.jsp-hijack").removeClass("jspHijack")}function m(){ai();b("a[href^=#]").addClass("jspHijack").bind("click.jsp-hijack",function(){var s=this.href.split("#"),aJ;if(s.length>1){aJ=s[1];if(aJ.length>0&&Y.find("#"+aJ).length>0){ab("#"+aJ,true);return false}}})}function ao(){var aK,aJ,aM,aL,aN,s=false;am.unbind("touchstart.jsp touchmove.jsp touchend.jsp click.jsp-touchclick").bind("touchstart.jsp",function(aO){var aP=aO.originalEvent.touches[0];aK=aD();aJ=aB();aM=aP.pageX;aL=aP.pageY;aN=false;s=true}).bind("touchmove.jsp",function(aR){if(!s){return}var aQ=aR.originalEvent.touches[0],aP=aa,aO=I;Q.scrollTo(aK+aM-aQ.pageX,aJ+aL-aQ.pageY);aN=aN||Math.abs(aM-aQ.pageX)>5||Math.abs(aL-aQ.pageY)>5;
return aP==aa&&aO==I}).bind("touchend.jsp",function(aO){s=false}).bind("click.jsp-touchclick",function(aO){if(aN){aN=false;return false}})}function g(){var s=aB(),aJ=aD();D.removeClass("jspScrollable").unbind(".jsp");D.replaceWith(ap.append(Y.children()));ap.scrollTop(s);ap.scrollLeft(aJ)}b.extend(Q,{reinitialise:function(aJ){aJ=b.extend({},az,aJ);at(aJ)},scrollToElement:function(aK,aJ,s){ab(aK,aJ,s)},scrollTo:function(aK,s,aJ){N(aK,aJ);M(s,aJ)},scrollToX:function(aJ,s){N(aJ,s)},scrollToY:function(s,aJ){M(s,aJ)},scrollToPercentX:function(aJ,s){N(aJ*(T-ak),s)},scrollToPercentY:function(aJ,s){M(aJ*(Z-v),s)},scrollBy:function(aJ,s,aK){Q.scrollByX(aJ,aK);Q.scrollByY(s,aK)},scrollByX:function(s,aK){var aJ=aD()+Math[s<0?"floor":"ceil"](s),aL=aJ/(T-ak);W(aL*j,aK)},scrollByY:function(s,aK){var aJ=aB()+Math[s<0?"floor":"ceil"](s),aL=aJ/(Z-v);V(aL*i,aK)},positionDragX:function(s,aJ){W(s,aJ)},positionDragY:function(aJ,s){V(aJ,s)},animate:function(aJ,aM,s,aL){var aK={};aK[aM]=s;aJ.animate(aK,{duration:az.animateDuration,ease:az.animateEase,queue:false,step:aL})},getContentPositionX:function(){return aD()},getContentPositionY:function(){return aB()},getContentWidth:function(){return T},getContentHeight:function(){return Z},getPercentScrolledX:function(){return aD()/(T-ak)},getPercentScrolledY:function(){return aB()/(Z-v)},getIsScrollableH:function(){return aF},getIsScrollableV:function(){return aA},getContentPane:function(){return Y},scrollToBottom:function(s){V(i,s)},hijackInternalLinks:function(){m()},destroy:function(){g()}});at(O)}e=b.extend({},b.fn.jScrollPane.defaults,e);b.each(["mouseWheelSpeed","arrowButtonSpeed","trackClickSpeed","keyboardSpeed"],function(){e[this]=e[this]||e.speed});return this.each(function(){var f=b(this),g=f.data("jsp");if(g){g.reinitialise(e)}else{g=new d(f,e);f.data("jsp",g)}})};b.fn.jScrollPane.defaults={showArrows:false,maintainPosition:true,stickToBottom:false,stickToRight:false,clickOnTrack:true,autoReinitialise:false,autoReinitialiseDelay:500,verticalDragMinHeight:0,verticalDragMaxHeight:99999,horizontalDragMinWidth:0,horizontalDragMaxWidth:99999,contentWidth:c,animateScroll:false,animateDuration:300,animateEase:"linear",hijackInternalLinks:false,verticalGutter:4,horizontalGutter:4,mouseWheelSpeed:0,arrowButtonSpeed:0,arrowRepeatFreq:50,arrowScrollOnHover:false,trackClickSpeed:0,trackClickRepeatFreq:70,verticalArrowPositions:"split",horizontalArrowPositions:"split",enableKeyboardNavigation:true,hideFocus:false,keyboardSpeed:0,initialDelay:300,speed:30,scrollPagePercent:0.8}})(jQuery,this);

var exports=exports||this;exports.OAuth = function(a) {
	function u(a, b) {return a << b | a >>> 32 - b}

	function t(a) {
		var b = "",c = a.length,d;
		for (d = 0; d < c; d++)b += String.fromCharCode(a[d]);
		return b
	}

	function s(a) {
		var b = [],c = a.length,d;
		for (d = 0; d < c; d++)b.push((a[d] >>> 4).toString(16)),b.push((a[d] & 15).toString(16));
		return b.join("")
	}

	function r(a) {
		var b = [],c;
		for (c = 0; c < a.length * 32; c += 8)b.push(a[c >>> 5] >>> 24 - c % 32 & 255);
		return b
	}

	function q(a) {
		var b = [],c;
		for (i = 0; i < a.length; i++)c = a.charCodeAt(i),c < 128 ? b.push(c) : c < 2048 ? b.push(192 + (c >> 6), 128 + (c & 63)) : c < 65536 ? b.push(224 + (c >> 12), 128 + (c >> 6 & 63), 128 + (c & 63)) : c < 2097152 && b.push(240 + (c >> 18), 128 + (c >> 12 & 63), 128 + (c >> 6 & 63), 128 + (c & 63));
		return b
	}

	function p(a) {
		var b = Array(++a);
		return b.join(0).split("")
	}

	function o(a, b, c, d) {
		var e = q(b),f = q(c),g = e.length,h,i,j,k;
		g > a.blocksize && (e = a.hash(e),g = e.length),e = e.concat(p(a.blocksize - g)),i = e.slice(0),j = e.slice(0);
		for (k = 0; k < a.blocksize; k++)i[k] ^= 92,j[k] ^= 54;
		h = a.hash(i.concat(a.hash(j.concat(f))));
		if (d)return s(h);
		return t(h)
	}

	function n(a) {
		if (a !== undefined) {
			var b = a,c,d;
			b.constructor === String && (b = q(b)),this instanceof n ? c = this : c = new n(a),d = c.hash(b);
			return s(d)
		}
		if (!(this instanceof n))return new n;
		return this
	}

	function m() {
		var b;
		typeof a.Titanium != "undefined" && typeof a.Titanium.Network.createHTTPClient != "undefined" ? b = a.Titanium.Network.createHTTPClient() : typeof require != "undefined" ? b = (new require("xhr")).XMLHttpRequest() : b = new a.XMLHttpRequest;
		return b
	}

	function l(a) {
		function b() {return Math.floor(Math.random() * h.length)}

		a = a || 64;
		var c = a / 8,d = "",e = c / 4,f = c % 4,g,h = ["20","21","22","23","24","25","26","27","28","29","2A","2B","2C","2D","2E","2F","30","31","32","33","34","35","36","37","38","39","3A","3B","3C","3D","3E","3F","40","41","42","43","44","45","46","47","48","49","4A","4B","4C","4D","4E","4F","50","51","52","53","54","55","56","57","58","59","5A","5B","5C","5D","5E","5F","60","61","62","63","64","65","66","67","68","69","6A","6B","6C","6D","6E","6F","70","71","72","73","74","75","76","77","78","79","7A","7B","7C","7D","7E"];
		for (g = 0; g < e; g++)d += h[b()] + h[b()] + h[b()] + h[b()];
		for (g = 0; g < f; g++)d += h[b()];
		return d
	}

	function k() {return parseInt(+(new Date) / 1e3, 10)}

	function j(a, b, c, d) {
		var e = [],f,h = g.urlEncode;
		for (f in c)c[f] !== undefined && c[f] !== "" && e.push(g.urlEncode(f) + "=" + g.urlEncode(c[f] + ""));
		for (f in d)d[f] !== undefined && d[f] !== "" && (c[f] || e.push(h(f) + "=" + h(d[f] + "")));
		return[a,h(b),h(e.sort().join("&"))].join("&")
	}

	function h(a) {
		var b = [],c;
		for (c in a)a[c] && a[c] !== undefined && a[c] !== "" && b.push(c + '="' + g.urlEncode(a[c] + "") + '"');
		return b.sort().join(", ")
	}

	function g(a) {
		if (!(this instanceof g))return new g(a);
		return this.init(a)
	}

	function e(a) {
		var b = arguments,c = b.callee,d = b.length,e,f = this;
		if (!(this instanceof c))return new c(a);
		if (a != undefined)for (e in a)a.hasOwnProperty(e) && (f[e] = a[e]);
		return f
	}

	function d(a) {
		var b = arguments,c = b.callee,d,f,g,h,i,j,k,l = /^([^:\/?#]+?:\/\/)*([^\/:?#]*)?(:[^\/?#]*)*([^?#]*)(\?[^#]*)?(#(.*))*/;
		uri = this;
		if (!(this instanceof c))return new c(a);
		uri.scheme = "",uri.host = "",uri.port = "",uri.path = "",uri.query = new e,uri.anchor = "";
		if (a !== null) {
			d = a.match(l),f = d[1],g = d[2],h = d[3],i = d[4],j = d[5],k = d[6],f = f !== undefined ? f.replace("://", "").toLowerCase() : "http",h = h ? h.replace(":", "") : f === "https" ? "443" : "80",f = f == "http" && h === "443" ? "https" : f,j = j ? j.replace("?", "") : "",k = k ? k.replace("#", "") : "";
			if (f === "https" && h !== "443" || f === "http" && h !== "80")g = g + ":" + h;
			uri.scheme = f,uri.host = g,uri.port = h,uri.path = i || "/",uri.query.setQueryParams(j),uri.anchor = k || ""
		}
	}

	function c() {}

	function b(a) {
		var b = arguments,c = b.callee,d = b.length,e,f = this;
		if (!(this instanceof c))return new c(a);
		for (e in a)a.hasOwnProperty(e) && (f[e] = a[e]);
		return f
	}

	c.prototype = {join:function(a) {
		a = a || "";
		return this.values().join(a)
	},keys:function() {
		var a,b = [],c = this;
		for (a in c)c.hasOwnProperty(a) && b.push(a);
		return b
	},values:function() {
		var a,b = [],c = this;
		for (a in c)c.hasOwnProperty(a) && b.push(c[a]);
		return b
	},shift:function() {throw"not implimented"},unshift:function() {throw"not implimented"},push:function() {throw"not implimented"},pop:function() {throw"not implimented"},sort:function() {throw"not implimented"},ksort:function(a) {
		var b = this,c = b.keys(),d,e,f;
		a == undefined ? c.sort() : c.sort(a);
		for (d = 0; d < c.length; d++)f = c[d],e = b[f],delete b[f],b[f] = e;
		return b
	},toObject:function() {
		var a = {},b,c = this;
		for (b in c)c.hasOwnProperty(b) && (a[b] = c[b]);
		return a
	}},b.prototype = new c,d.prototype = {scheme:"",host:"",port:"",path:"",query:"",anchor:"",toString:function() {
		var a = this,b = a.query + "";
		return a.scheme + "://" + a.host + a.path + (b != "" ? "?" + b : "") + (a.anchor !== "" ? "#" + a.anchor : "")
	}},e.prototype = new b,e.prototype.toString = function() {
		var a,b = this,c = [],d = "",e = "",f = g.urlEncode;
		b.ksort();
		for (a in b)b.hasOwnProperty(a) && (a != undefined && b[a] != undefined && (e = f(a) + "=" + f(b[a])),c.push(e));
		c.length > 0 && (d = c.join("&"));
		return d
	},e.prototype.setQueryParams = function(a) {
		var b = arguments,c = b.length,d,e,f,g = this,h;
		if (c == 1) {
			if (typeof a == "object")for (d in a)a.hasOwnProperty(d) && (g[d] = a[d]); else if (typeof a == "string") {
				e = a.split("&");
				for (d = 0,f = e.length; d < f; d++)h = e[d].split("="),g[h[0]] = h[1]
			}
		} else for (d = 0; d < arg_length; d += 2)g[b[d]] = b[d + 1]
	};
	var f = "1.0";
	g.prototype = {realm:"",requestTokenUrl:"",authorizationUrl:"",accessTokenUrl:"",init:function(a) {
		var b = "",c = {enablePrivilege:a.enablePrivilege || !1,callbackUrl:a.callbackUrl || "oob",consumerKey:a.consumerKey,consumerSecret:a.consumerSecret,accessTokenKey:a.accessTokenKey || b,accessTokenSecret:a.accessTokenSecret || b,verifier:"",signatureMethod:a.signatureMethod || "HMAC-SHA1"};
		this.realm = a.realm || b,this.requestTokenUrl = a.requestTokenUrl || b,this.authorizationUrl = a.authorizationUrl || b,this.accessTokenUrl = a.accessTokenUrl || b,this.getAccessToken = function() {return[c.accessTokenKey,c.accessTokenSecret]},this.setAccessToken = function(a) {c.accessTokenKey = a[0],c.accessTokenSecret = a[1]},this.getVerifier = function() {return c.verifier},this.setVerifier = function(a) {c.verifier = a},this.request = function(a) {
			var b,e,i,n,o,p,q,r,s,t,u,v,w = [],x,y = {},z,A;
			b = a.method || "GET",e = d(a.url),i = a.data || {},n = a.headers || {},o = a.success || function(a) {},p = a.failure || function() {},A = function() {
				var a = !1;
				for (var b in i)typeof i[b].fileName != "undefined" && (a = !0);
				return a
			}(),x = a.appendQueryString ? a.appendQueryString : !1,c.enablePrivilege && netscape.security.PrivilegeManager.enablePrivilege("UniversalBrowserRead UniversalBrowserWrite"),q = m(),q.onreadystatechange = function() {
				if (q.readyState === 4) {
					var a = /^(.*?):\s*(.*?)\r?$/mg,b = n,c = {},d = "",e;
					if (!q.getAllResponseHeaders) {
						if (!!q.getResponseHeaders) {
							d = q.getResponseHeaders();
							for (var f = 0,g = d.length; f < g; ++f)c[d[f][0]] = d[f][1]
						}
					} else {
						d = q.getAllResponseHeaders();
						while (e = a.exec(d))c[e[1]] = e[2]
					}
					var h = {text:q.responseText,requestHeaders:b,responseHeaders:c};
					q.status >= 200 && q.status < 400 || q.status === 0 ? o(h) : q.status >= 400 && q.status !== 0 && p(h)
				}
			},s = {oauth_callback:c.callbackUrl,oauth_consumer_key:c.consumerKey,oauth_token:c.accessTokenKey,oauth_signature_method:c.signatureMethod,oauth_timestamp:k(),oauth_nonce:l(),oauth_verifier:c.verifier,oauth_version:f},t = c.signatureMethod,z = e.query.toObject();
			for (r in z)y[r] = z[r];
			if (!A)for (r in i)y[r] = i[r];
			urlString = e.scheme + "://" + e.host + e.path,u = j(b, urlString, s, y),v = g.signatureMethod[t](c.consumerSecret, c.accessTokenSecret, u),s.oauth_signature = v;
			if (x || b == "GET")e.query.setQueryParams(i),w = null; else if (!A) {
				for (r in i)w.push(g.urlEncode(r) + "=" + g.urlEncode(i[r] + ""));
				w = w.sort().join("&"),n["Content-Type"] = "application/x-www-form-urlencoded"
			} else if (A) {
				w = new FormData;
				for (r in i)w.append(r, i[r])
			}
			q.open(b, e + "", !0),q.setRequestHeader("Authorization", "OAuth " + h(s)),q.setRequestHeader("X-Requested-With", "XMLHttpRequest");
			for (r in n)q.setRequestHeader(r, n[r]);
			q.send(w)
		};
		return this
	},get:function(a, b, c) {this.request({url:a,success:b,failure:c})},post:function(a, b, c, d) {this.request({method:"POST",url:a,data:b,success:c,failure:d})},getJSON:function(a, b, c) {this.get(a, function(a) {b(JSON.parse(a.text))}, c)},parseTokenRequest:function(a) {
		var b = 0,c = a.split("&"),d = c.length,e = {};
		for (; b < d; ++b) {
			var f = c[b].split("=");
			e[f[0]] = f[1]
		}
		return e
	},fetchRequestToken:function(a, b) {
		var c = this.authorizationUrl,d = this;
		this.get(this.requestTokenUrl, function(b) {
			var e = d.parseTokenRequest(b.text);
			d.setAccessToken([e.oauth_token,e.oauth_token_secret]),a(c + "?" + b.text)
		}, b)
	},fetchAccessToken:function(a, b) {
		var c = this;
		this.get(this.accessTokenUrl, function(b) {
			var d = c.parseTokenRequest(b.text);
			c.setAccessToken([d.oauth_token,d.oauth_token_secret]),a(b)
		}, b)
	}},g.signatureMethod = {"HMAC-SHA1":function(b, c, d) {
		var e,f,h = g.urlEncode;
		b = h(b),c = h(c || ""),e = b + "&" + c,f = o(n.prototype, e, d);
		return a.btoa(f)
	}},g.urlEncode = function(a) {
		function b(a) {return"%" + a.toString(16).toUpperCase()}

		if (!a)return"";
		a = a + "";
		var c = /[ !*"'();:@&=+$,\/?%#\[\]<>{}|`^\\\u0080-\uffff]/,d = a.length,e,f = a.split(""),g;
		for (e = 0; e < d; e++)if (g = f[e].match(c))g = g[0].charCodeAt(0),g < 128 ? f[e] = b(g) : g < 2048 ? f[e] = b(192 + (g >> 6)) + b(128 + (g & 63)) : g < 65536 ? f[e] = b(224 + (g >> 12)) + b(128 + (g >> 6 & 63)) + b(128 + (g & 63)) : g < 2097152 && (f[e] = b(240 + (g >> 18)) + b(128 + (g >> 12 & 63)) + b(128 + (g >> 6 & 63)) + b(128 + (g & 63)));
		return f.join("")
	},g.urlDecode = function(a) {
		if (!a)return"";
		return a.replace(/%[a-fA-F0-9]{2}/ig, function(a) {return String.fromCharCode(parseInt(a.replace("%", ""), 16))})
	},n.prototype = new n,n.prototype.blocksize = 64,n.prototype.hash = function(a) {
		function A(a, b, c, d) {
			switch (a) {
				case 0:
					return b & c | ~b & d;
				case 1:
				case 3:
					return b ^ c ^ d;
				case 2:
					return b & c | b & d | c & d
			}
			return-1
		}

		var b = [1732584193,4023233417,2562383102,271733878,3285377520],c = [1518500249,1859775393,2400959708,3395469782],d,e,f,g,h,i,j,k,l,m,n,o,s,t,v,w,x,y,z;
		a.constructor === String && (a = q(a.encodeUTF8())),f = a.length,g = Math.ceil((f + 9) / this.blocksize) * this.blocksize - (f + 9),e = Math.floor(f / 4294967296),d = Math.floor(f % 4294967296),h = [e * 8 >> 24 & 255,e * 8 >> 16 & 255,e * 8 >> 8 & 255,e * 8 & 255,d * 8 >> 24 & 255,d * 8 >> 16 & 255,d * 8 >> 8 & 255,d * 8 & 255],a = a.concat([128], p(g), h),i = Math.ceil(a.length / this.blocksize);
		for (j = 0; j < i; j++) {
			k = a.slice(j * this.blocksize, (j + 1) * this.blocksize),l = k.length,m = [];
			for (n = 0; n < l; n++)m[n >>> 2] |= k[n] << 24 - (n - (n >> 2) * 4) * 8;
			o = b[0],s = b[1],t = b[2],v = b[3],w = b[4];
			for (x = 0; x < 80; x++)x >= 16 && (m[x] = u(m[x - 3] ^ m[x - 8] ^ m[x - 14] ^ m[x - 16], 1)),y = Math.floor(x / 20),z = u(o, 5) + A(y, s, t, v) + w + c[y] + m[x],w = v,v = t,t = u(s, 30),s = o,o = z;
			b[0] += o,b[1] += s,b[2] += t,b[3] += v,b[4] += w
		}
		return r(b)
	};
	return g
}(this),function(a) {
	var b = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
	a.btoa = a.btoa || function(a) {
		var c = 0,d = a.length,e,f,g = "";
		for (; c < d; c += 3)e = [a.charCodeAt(c),a.charCodeAt(c + 1),a.charCodeAt(c + 2)],f = [e[0] >> 2,(e[0] & 3) << 4 | e[1] >> 4,(e[1] & 15) << 2 | e[2] >> 6,e[2] & 63],isNaN(e[1]) && (f[2] = 64),isNaN(e[2]) && (f[3] = 64),g += b[f[0]] + b[f[1]] + b[f[2]] + b[f[3]];
		return g
	}
}(this);
