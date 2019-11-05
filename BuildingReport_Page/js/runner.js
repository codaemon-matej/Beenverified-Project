$(function() {
    /**
     * Helper to get query param values by name
     */
    var BVGetQueryVariable = function(variable) {
        var query = window.location.search.substring(1);
        var vars = query.split("&");

        for (var i = 0; i < vars.length; i++) {
            var pair = vars[i].split("=");
            if (pair[0] == variable) {
                return pair[1];
            }
        }
        return false;
    };

    var formatPhoneNumber = function(phoneNumber) {
        phoneNumber = phoneNumber.toString();
        var formatted = phoneNumber.replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3');
        return formatted;
    };

    var storePhoneOnLocalStorage = function(phone) {
phone='5405881340';
        if (phone) {
            amplify.store('bv_searchData', {
                "phoneNumber": phone,
                "formattedPhoneNumber": formatPhoneNumber(phone),
            });
        }
    }

    storePhoneOnLocalStorage(BVGetQueryVariable('phone'))
    searchData = amplify.store().bv_searchData;
    SECTION_TYPE = ['url', 'email', 'image_url', 'phone', 'education'];
    animationDuration = 125000;

    var sections = $('section');
    var displayCountInterval = (animationDuration / sections.length) - 6700;

    $.extend($.easing, {
        easeBV: function(x, t, b, c, d) {
            var ts = (t /= d) * t;
            var tc = ts * t;
            //return b+c*(24.045*tc*ts + -62.59*ts*ts + 56.395*tc + -20.2*ts + 3.35*t);
            //return b+c*(15.545*tc*ts + -32.14*ts*ts + 19.195*tc + -2*ts + 0.4*t);
            //return b+c*(14.545*tc*ts + -33.39*ts*ts + 23.595*tc + -4.4*ts + 0.65*t);
            return (
                b +
                c *
                (18.5 * tc * ts + -46.6 * ts * ts + 38.9 * tc + -11.6 * ts + 1.8 * t)
            );
            //return b+c*(22.645*tc*ts + -59.29*ts*ts + 54.895*tc + -21.3*ts + 4.05*t);
        }
    });

    var socialFinders = function() {
        duration = 17000;

        var $lis = $('#social-media-groups li'),
            listLen = $lis.length,
            listIdxs = _.shuffle(_.range(0, listLen)),
            currIdx = 0;

        intervalId = window.setInterval(function() {
            if (currIdx >= listLen) {
                $('#socialMedia .highlighted')
                    .hide()
                    .text('Complete!')
                    .fadeIn();

                window.setTimeout(function() {
                    // showNextSection();
                }, self.transitionDelay);

                return window.clearInterval(intervalId);
            }
            var listIdx = listIdxs[currIdx],
                $loadingImg = $($lis[listIdx]).find('.loading'),
                profileName = $loadingImg
                .next()[0]
                .classList[1].capitalize()
                .split('-')
                .join(' ');

            $loadingImg.css('opacity', 0);
            $loadingImg.next().fadeIn();
            $('#website')
                .hide()
                .text(profileName)
                .fadeIn();
            // addClass('success');

            currIdx += 1;
        }, Math.round(duration / listLen));
    };

    var progressConfig = {
        startedTime: null,
        progressInterval: null,
        MAX_PERCENTAGE: 100,
    };

    function progressIntervalCheck() {
        const milliSecondsDisplayed = (new Date().getTime()) - progressConfig.startedTime.getTime();
        const percentageDisplayed = (milliSecondsDisplayed * progressConfig.MAX_PERCENTAGE) / animationDuration;
        if (percentageDisplayed >= progressConfig.MAX_PERCENTAGE) {
            initializeFCRA();
            clearInterval(this.progressInterval);
        }
    }

    var startLoader = function() {
        // The status of yellow banner name display
        var isActive = criminalFlag = emailFlag = photoFlag = jobFlag = premiumFlag = finishFlag = false;
        progressConfig.startedTime = new Date();
        var progress = $('.bar').animate({
            width: '100%'
        }, {
            duration: animationDuration,
            easing: 'linear',
            step: function(step) {
                var percent = Math.floor(step);

                var percentRemain = 100 - percent.toString(),
                    durationRemain = animationDuration * percentRemain / 100;

                timeRemaining = Math.floor((durationRemain / 1000) % 60);

                if (percent === 10 && !isActive) {
                    var fullTeaser = amplify.store('fullTeaser') || {};
                    var fullTeaserName = fullTeaser.names;

                    if (fullTeaserName.length) {
                      $('.owner-wrapper').fadeOut("slow", function() {
                            $(this).removeClass('hidden').removeClass('visibility-hidden').addClass('visibility-show');
                        });
                    } else if (jQuery(window).width() < 768) {
                        $('.left-side').not('#socialMedia .left-side').css('padding-top', '5px');
                    }
                    isActive = true;
                } else if (percent === 16 && !criminalFlag) {
                    changeSections(1);
                    SearchingCriminalDatabase();
                    criminalFlag = true;
                } else if (percent === 33 && !emailFlag) {
                    changeSections(2);
                    visitingCardLoader();
                    emailFlag = true;
                } else if (percent === 50 && !photoFlag) {
                    changeSections(3);
                    photoFlag = true;
                } else if (percent === 67 && !jobFlag) {
                    window.setTimeout(function () {
                        changeSections(4);
                    }, 20);
                    jobFlag = true;
                } else if (percent === 84 && !premiumFlag) {
                    window.setTimeout(function () {
                        changeSections(5);
                    }, 20);
                    premiumFlag = true;
                } else if (percent >= 99 && !finishFlag) {
                    if (!progressConfig.progressInterval) {
                        progressInterval = setInterval(progressIntervalCheck, 1000);
                    }
                    finishFlag = true;
                }
            }
        });
    };

    var displayCount = function(idx) {
        var data = amplify.store().fullTeaser;
        if (!data) {
            return;
        }
        var dataCounts = data.available_data_counts;

        if (!dataCounts) {
            return;
        }
        var currentCount = dataCounts[SECTION_TYPE[idx]],
            $notification = $('.notification')[idx];
        if (SECTION_TYPE[idx] === 'phone') {
            currentCount = dataCounts[SECTION_TYPE[idx]].total;
        }

        if (currentCount > 0) {
            $('#notificationBox').show();
            $($notification).addClass('active');
            var screenWidth = jQuery( window ).width();
            if (screenWidth < 768) {
                $('.notification .notify-text').hide();
                var notificationBoxDisplayed = $('.notification.active').length;
                if (notificationBoxDisplayed < 5 || screenWidth > 390) $($notification).find('.notify-text').show();
            } else {
                if (currentCount > 1) $($notification).find('span.notify-multiple').show();
                if(screenWidth >= 768 && screenWidth < 991) {
                    var notificationBoxDisplayed = $('.notification.active').length;
                    if (notificationBoxDisplayed > 4) $('.notification.active').find('span.notify-text').hide();
                }
            }
        }
    };

    var changeSections = function(sectionIdx) {
        sections.removeClass('active');
        $(sections[sectionIdx]).addClass('active');
        window.setTimeout(function() {
            displayCount(sectionIdx);
        }, displayCountInterval);

        // added this little hack for now to keep final section as displayed, because
        // active class will be removed
        if ($(sections[sectionIdx]).is('#premiumBox')) {
            $(sections[sectionIdx]).addClass('block-hack');
        }
    };

    var getTeaserData = function() {
        if (!searchData) {
            return;
        }
        var baseUrl = 'https://www.beenverified.com/hk/dd/teaser/phone',
            url = baseUrl + '?phone=' + searchData.phoneNumber + '&type=full',
            xhrData = $.ajax({
                url: url,
                dataType: 'jsonp'
            });

        $.when(
            xhrData.done(function(result, success) {
                if (success === 'success' && !$.isEmptyObject(result)) {
                    amplify.store('fullTeaser', result);
                }
                window.setTimeout(function() {
                    displayCount(0);
                }, animationDuration / 5 - 3000);
            })
        );
    };

    function SearchingCriminalDatabase() {
        var CriminalDatabase = setInterval(function() {
           var nextItem = $('.js-criminal-list li').not(".bgr-check").first();
            if (nextItem.length) {
                setInterval(function(){ nextItem.removeClass('blur-text').addClass('bgr-check'); }, 1800);
            } else {
                clearInterval(CriminalDatabase);
            }
        }, 2000);
    }

    function visitingCardLoader() {
        var visitCard = $(".card");
        var tl = new TimelineMax();
        tl.staggerFrom(visitCard, 2.0, {
            opacity:0,
            y:40,
            ease: Power2.easeInOut
        }, 2.7);
    }

    var initializeFCRA = function() {
        $('button.btn-success').addClass('disabled');
        $('#fcraCheckbox2').prop('checked', '');

        $('.report-warning-dialog').modal({
            show: true,
            backdrop: 'static',
            keyboard: false
        });

        $('#fcra-confirm').validate({
            rules: {
                fcraCheckbox2: 'required'
            },
            messages: {
                fcraCheckbox2: 'Please check the box to continue'
            },
            submitHandler: function(form, e) {
                e.preventDefault();
                $('.report-warning-dialog').modal('hide');
                $('body').css('opacity', '0');
                window.location.href = $('body').data('next-page');
            }
        });
    };
  var toNextPage = function () {
    window.location = $('body').data('next-page');
  }

  var keyMap = function (fn, keys, nextKey) {
    var maxKeyIndex = keys.length - 1;
    if (nextKey > maxKeyIndex) {
      fn();
      nextKey = 0;
    }
  };

  var initializeBVGO = function (fn) {
    var keys = [66, 86, 71, 79]; // Represent the command 'bvgo'.
    var nextKey = 0;
    $(window).keydown(function (e) {
      var key = e.which;
      nextKey = (key === keys[nextKey]) ? nextKey + 1 : 0;
      keyMap(fn, keys, nextKey);
    });
  };
    $('#fcraCheckbox2, button.btn-success').on('click', function() {
        if ($('#fcra-confirm').valid()) {
            $('button.btn-success').prop('disabled', false);
            $('button.btn-success').removeClass('disabled');
        } else {
            $('button.btn-success').prop('disabled', 'disabled');
            $('button.btn-success').addClass('disabled');
        }
    });

    var initialize = function() {
        initializeBVGO(toNextPage);
        getTeaserData();
        startLoader();
        socialFinders();
        changeSections(0);
    };

    initialize();

    window.onbeforeunload = function (e) {
        $('body').css('opacity', '0');
    };
    window.onpageshow = function(event) {
        if (event.persisted) {
            window.location.reload();
        }
    };

});
