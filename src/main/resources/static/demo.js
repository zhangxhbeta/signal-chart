/**
 * 往文档里面的 #chart 里面塞一张堆积图
 *
 * @author zhangxh
 */
$(function () {

  // 首先计算一下高度宽度
  var aspectRatio = 3; // 图表高度宽度比例 1:3
  var minDetailHeight = 30; // 详情区域最小高度 30px
  var smallDevicesWidth = 767; // 小屏幕宽度, 超出认定为其他大小
  var ieFix = 1;  // ie 滚动条出现, 所以高度要减去1
  var gridSize = 46; // 将大图表横向划分为固定的高度单元, 然后方便分配
  var xAxisMax = 1200; // 图表中展示的数据记录条数
  var margin = {
    top: 5,
    right: 28,
    bottom: 25,
    left: 150
  };
  var fontSize = 12;
  var fontSizeOffset = fontSize / 2;
  var labelLeftMargin = 30;
  var firstDateLabelFormat = d3.time.format('%Y-%m-%d');
  var dateLabelFormat = d3.time.format("%H:%M:%S");
  var maxVoltage = 2000, maxCarrierFrequency = 4000, maxLowFrequency = 40; // 感应电压/低频/载频部分的图表y轴最大值

  // 获取当前 chart 可用宽度, 然后根据比例算出可用高度
  var size = calcChartSize();

  // 根据窗口高度布局一次详情表格高度, 然后绑定 resiz 事件处理
  // 这里做了响应式, 如果是手机屏幕就不做自适应了
  if ($(window).innerWidth() > smallDevicesWidth) {
    layoutDetail(size.height);
  }

  // 开始部分，准备svg画布
  var svg = d3.select('#chart').append('svg')
      .attr('width', '100%')
      .attr('height', size.height)
      .attr('viewBox', '0 0 ' + size.width + " " + size.height)
      .style('display', 'block');
  d3.select('#version').html('机车图demo演示 (随机模拟数据)');

  // svg 画布已准备妥当，开始准备图表元素
  var height = size.height - margin.bottom - margin.top,
      width = size.width - margin.left - margin.right;
  var gridHeight = height / gridSize;
  var gridWidth = width / xAxisMax;

  // 准备全局 x 轴缩放器
  var x = d3.scale.linear()
      .domain([0, xAxisMax])
      .range([0, width]);

  // 生成测试数据
  var dataArray = generateTestData();

  // 计算子图表高度
  var chartOffset = margin.top;
  var chartHeight = gridHeight * 20;
  var lampBeltOffset = chartOffset + chartHeight + gridHeight;
  var semaphoreOffset = lampBeltOffset + gridHeight * 3;
  var semaphoreHeight = gridHeight * 4;
  var insulationOffset = semaphoreOffset + semaphoreHeight + gridHeight * 2;
  var upDownOffset = insulationOffset + gridHeight * 4;
  var abOffset = upDownOffset + gridHeight * 4;
  var port12Offset = abOffset + gridHeight * 4;

  // 绘制静态文本
  drawText();

  // 绘制图表
  update();

  // 添加鼠标点击时的指示竖线
  var selectLine;
  var drag = d3.behavior.drag();
  drag.on('drag', function () {
    var e = d3.mouse(d3.select('#chart').node());
    var x = adjustX(e[0]);

    if (x < margin.left) {
      x = margin.left;
    }

    if (x > (size.width - margin.right)) {
      x = size.width - margin.right;
    }

    if (selectLine) {
      selectLine.attr('x1', x)
          .attr('x2', x);
    }
  });

  svg.on('click', function () {
    var e = d3.mouse(d3.select('#chart').node());
    // 点在外面的不处理
    if (e[0] < margin.left || e[0] > (size.width - margin.right)) {
      return;
    }

    var x = adjustX(e[0]);

    if (selectLine) {
      selectLine.attr('x1', x)
          .attr('x2', x);
    } else {
      selectLine = svg.append('line').attr('x1', x)
          .attr('y1', margin.top)
          .attr('x2', x)
          .attr('y2', size.height)
          .style('stroke', '#000')
          .style('stroke-width', '2')
          .style('cursor', 'ew-resize')
          .call(drag);
    }

  });

  // 对窗口缩放做一下处理
  $(window).resize(function () {
    var size = calcChartSize();
    $('#chart svg').height(size.height);

    if ($(window).innerWidth() > 767) {
      layoutDetail(size.height);
    }
  });

  function update() {
    // 绘制图表, 感应电压/载频/低频,速度
    drawChart(chartOffset, chartHeight);

    // 绘制灯带
    drawLampBelt(lampBeltOffset, gridHeight * 1.5);

    // 绘制信号机
    drawSemaphore(semaphoreOffset, semaphoreHeight);

    // 准备一个映射器
    var y = d3.scale.linear()
        .domain([0, 1])
        .range([gridHeight * 2, 0]);

    // 绘制绝缘
    drawInsulationChairLine(insulationOffset, function (d) {
      return y(d.insulation);
    });

    // 绘制上/下行
    drawChairLine(upDownOffset, 'updown', function (d) {
      return y(d.upDown);
    });

    // 绘制A/B机
    drawChairLine(abOffset, 'ab', function (d) {
      return y(d.ab);
    });

    // 绘制 1/2 端
    drawChairLine(port12Offset, 'port12', function (d) {
      return y(d.port12);
    });

    // 绘制 x 轴
    drawXAxis(margin.top + height);
  }

  function drawText() {
    svg.append('text')
        .attr("x", 0)
        .attr("y", chartOffset + fontSizeOffset)
        .attr("dy", ".35em")
        .text(maxVoltage + 'mV');

    svg.append('text')
        .attr("x", 0)
        .attr("y", chartOffset + fontSizeOffset + fontSize)
        .attr("dy", ".35em")
        .text(maxCarrierFrequency + 'Hz');

    svg.append('text')
        .attr("x", 0)
        .attr("y", chartOffset + fontSizeOffset + fontSize * 2)
        .attr("dy", ".35em")
        .text(maxLowFrequency + '(Hz/ms)');

    svg.append('text')
        .attr("x", 0)
        .attr("y", chartOffset + gridHeight * 6)
        .attr("dy", ".55em")
        .text('上电标志');

    svg.append('text')
        .attr("x", labelLeftMargin)
        .attr("y", lampBeltOffset + fontSizeOffset)
        .attr("dy", ".55em")
        .text('灯码超防');

    svg.append('text')
        .attr("x", labelLeftMargin)
        .attr("y", semaphoreOffset + gridHeight + fontSizeOffset)
        .attr("dy", ".55em")
        .text('信号机');

    svg.append('text')
        .attr("x", labelLeftMargin)
        .attr("y", insulationOffset + fontSizeOffset)
        .attr("dy", ".55em")
        .text('绝缘');

    svg.append('text')
        .attr("x", labelLeftMargin)
        .attr("y", upDownOffset + fontSizeOffset)
        .attr("dy", ".55em")
        .text('上/下行');

    svg.append('text')
        .attr("x", labelLeftMargin)
        .attr("y", abOffset + fontSizeOffset)
        .attr("dy", ".55em")
        .text('A/B机');

    svg.append('text')
        .attr("x", labelLeftMargin)
        .attr("y", port12Offset + fontSizeOffset)
        .attr("dy", ".55em")
        .text('1/2端');

    svg.append('text')
        .attr("x", labelLeftMargin)
        .attr("y", margin.top + height + fontSizeOffset)
        .attr("dy", ".55em")
        .text('时间里程');
  }

  /**
   * 绘制图表的部分
   */
  function drawChart(chartOffset, chartHeight) {
    svg.select('g.lineChart').remove();

    // 添加组
    var groupChart = svg.append('g')
        .attr('class', 'lineChart')
        .attr('transform', 'translate(' + margin.left + ',' + chartOffset + ')');

    // 绘制竖方向网格
    function makeXAxis() {
      return d3.svg.axis()
          .scale(x)
          .orient("bottom")
          .ticks(10);
    }

    groupChart.append("g")
        .attr("class", "grid")
        .call(makeXAxis().tickSize(chartHeight, 0, 0).tickFormat(''));

    // 绘制感应电压
    var yVoltage = d3.scale.linear()
        .domain([0, maxVoltage])
        .range([chartHeight, 0]);

    var lineVoltage = d3.svg.line().x(function (d, i) {
      return x(i);
    }).y(function (d) {
      return yVoltage(d.voltage);
    });

    // 绘制背景网格/x/y轴
    function makeYAxis() {
      return d3.svg.axis()
          .scale(yVoltage)
          .orient("left")
          .ticks(5);
    }

    groupChart.append("g")
        .attr("class", "grid")
        .call(makeYAxis().tickSize(-width, 0, 0).tickFormat(''));

    groupChart.append("path")
        .attr('class', 'pathVoltage')
        .datum(dataArray)
        .attr("d", lineVoltage)
        .style("fill", "none")
        .style("stroke-width", 1)
        .style("stroke", '#d00')
        .style("stroke-opacity", 0.9);

    // 绘制载频
    var yCarrierFrequency = d3.scale.linear()
        .domain([0, maxCarrierFrequency])
        .range([chartHeight, 0]);

    var lineCarrierFrequency = d3.svg.line().x(function (d, i) {
      return x(i);
    }).y(function (d) {
      return yCarrierFrequency(d.carrierFrequency);
    }).interpolate("step-after");

    groupChart.append("path")
        .datum(dataArray)
        .attr("d", lineCarrierFrequency)
        .style("fill", "none")
        .style("stroke-width", 1)
        .style("stroke", '#0d0')
        .style("stroke-opacity", 0.9);

    // 绘制低频
    var yLowFrequency = d3.scale.linear()
        .domain([0, maxLowFrequency])
        .range([chartHeight, 0]);

    var lineLowFrequency = d3.svg.line().x(function (d, i) {
      return x(i);
    }).y(function (d) {
      return yLowFrequency(d.lowFrequency);
    }).interpolate("step-after");

    groupChart.append("path")
        .datum(dataArray)
        .attr("d", lineLowFrequency)
        .style("fill", "none")
        .style("stroke-width", 1)
        .style("stroke", '#00d')
        .style("stroke-opacity", 0.9);
  }

  /**
   * 绘制灯带
   */
  function drawLampBelt(lampBeltOffset, lampBeltHeight) {
    // 绘制当前灯
    if (svg.select('g.lamp').size() == 0) {
      var circleRadii = [gridHeight, gridHeight * 0.4, gridHeight * 0.2];
      var groupLamp = svg.append('g')
          .attr('class', 'lamp')
          .attr('transform', 'translate(0,' + lampBeltOffset + ')');

      groupLamp.selectAll("circle")
          .data(circleRadii)
          .enter()
          .append('circle')
          .attr("cx", gridHeight)
          .attr("cy", gridHeight)
          .attr("r", function (d) {
            return d;
          })
          .style("fill", function (d) {
            var returnColor;
            var r = d / gridHeight;
            if (r === 1) {
              returnColor = "green";
            } else if (r >= 0.4) {
              returnColor = "purple";
            } else if (r >= 0.2) {
              returnColor = "red";
            }
            return returnColor;
          });
    }

    var lampBeltGroup = svg.select('g.lampBelt');
    if (lampBeltGroup.size() == 0) {
      lampBeltGroup = svg.append('g')
          .attr('class', 'lampBelt')
          .attr('transform', 'translate(' + margin.left + ',' + lampBeltOffset + ')');
    }

    var rectLamp1 = lampBeltGroup.selectAll("rect.lamp1")
        .data(dataArray);

    if (dataArray.length > xAxisMax) {
      rectLamp1.style("fill", function (d) {
        if (d.lamp.charAt(0) === '1') {
          return '#f00';
        } else {
          return '#00f';
        }
      });
    }

    rectLamp1.enter()
        .append("rect")
        .attr('class', 'lamp1')
        .attr("width", gridWidth)
        .attr("height", lampBeltHeight / 2)
        .attr('x', function (d, i) {
          return i * gridWidth;
        })
        .style("fill", function (d) {
          if (d.lamp.charAt(0) === '1') {
            return '#f00';
          } else {
            return '#00f';
          }
        });

    rectLamp1.exit().remove();

    var rectLamp2 = lampBeltGroup.selectAll("rect.lamp2")
        .data(dataArray);

    if (dataArray.length > xAxisMax) {
      rectLamp2.style("fill", function (d) {
        if (d.lamp.charAt(1) === '1') {
          return '#ff0';
        } else {
          return '#0ff';
        }
      });
    }

    rectLamp2.enter()
        .append('rect')
        .attr('class', 'lamp2')
        .attr('width', gridWidth)
        .attr('height', lampBeltHeight / 2)
        .attr('x', function (d, i) {
          return i * gridWidth;
        })
        .attr('y', lampBeltHeight / 2)
        .style("fill", function (d) {
          if (d.lamp.charAt(1) === '1') {
            return '#ff0';
          } else {
            return '#0ff';
          }
        });

    rectLamp2.exit().remove();
  }

  /**
   * 绘制阶梯图
   */
  function drawChairLine(seamaphoreOffset, cls, generateorY) {

    svg.select('g.' + cls).remove();

    var g = svg.append('g')
        .attr('class', cls)
        .attr('transform', 'translate(' + margin.left + ',' + seamaphoreOffset + ')');

    var line = d3.svg.line().x(function (d, i) {
      return x(i);
    }).y(generateorY).interpolate("step-after");

    g.append("path")
        .datum(dataArray)
        .attr("d", line)
        .style("fill", "none")
        .style("stroke-width", 1)
        .style("stroke", '#000')
        .style("stroke-opacity", 0.9);
  }

  /**
   * 绘制绝缘图 (多了颜色变换)
   */
  function drawInsulationChairLine(seamaphoreOffset, generateorY) {

    var g = svg.select('g.insulation');
    if (g.size() === 0) {
      svg.append("linearGradient")
          .attr("id", "line-gradient")
          .attr("x1", '0%').attr("y1", '0%')
          .attr("x2", '0%').attr("y2", '100%')
          .selectAll("stop")
          .data([
                  {offset: "0%", color: "red"},
                  {offset: "50%", color: "red"},
                  {offset: "100%", color: "blue"}
                ])
          .enter()
          .append("stop")
          .attr("offset", function (d) {
            return d.offset;
          })
          .attr("stop-color", function (d) {
            return d.color;
          });
    }

    // 首先移除掉自己
    g.remove();
    g = svg.append('g')
        .attr('class', 'insulation')
        .attr('transform', 'translate(' + margin.left + ',' + seamaphoreOffset + ')');

    var line = d3.svg.line().x(function (d, i) {
      return x(i);
    }).y(generateorY).interpolate("step-after");



    g.append("path")
        .datum(dataArray)
        .attr("d", line)
        .style("fill", "none")
        .style("stroke-width", 1)
        .style("stroke", 'url(#line-gradient)')
        .style("stroke-opacity", 0.9);
  }

  /**
   * 绘制信号机部分
   * @param seamaphoreOffset
   * @param semaphoreHeight
   */
  function drawSemaphore(seamaphoreOffset, semaphoreHeight) {

    var g = svg.select('g.semaphore');
    if (g.size() == 0) {
      // 先绘制底线
      svg.append('line').attr('x1', margin.left)
          .attr('y1', seamaphoreOffset + semaphoreHeight)
          .attr('x2', size.width - margin.right)
          .attr('y2', seamaphoreOffset + semaphoreHeight)
          .style('stroke', '#000');
    } else {
      // 删掉原来绘制的
      g.remove();
    }

    // 绘制信号
    var heightUnit = semaphoreHeight / 5;
    g = svg.append('g')
        .attr('class', 'semaphore')
        .attr('transform', 'translate(' + margin.left + ',' + seamaphoreOffset + ')');

    // 过滤数据
    var stationDatas = dataArray.reduce(
        function (previousValue, currentValue, currentIndex, array) {
          if (currentIndex != 0) {
            var prevIndexData = array[currentIndex - 1];
            if (prevIndexData.seamaphoreNo !== currentValue.seamaphoreNo
                || prevIndexData.seamaphoreState !== currentValue.seamaphoreState) {
              // 前一个状态和现在这个不同, 说明需要图表上绘制一下
              previousValue.push({
                                   index: currentIndex,
                                   value: currentValue
                                 });

            }
          }
          return previousValue;
        }, []);

    var grid = g.selectAll("g")
        .data(stationDatas)
        .enter()
        .append("g")
        .attr("transform", function (d, i) {
          return 'translate(' + x(d.index) + ',0)';
        });

    grid.append("line").attr('x1', 0)
        .attr('y1', function (d) {
          if (d.value.seamaphoreState === 'pass') {
            return heightUnit + heightUnit / 2;
          } else {
            return 0;
          }
        })
        .attr('x2', 0)
        .attr('y2', semaphoreHeight)
        .style("stroke", '#000');

    grid.append('circle')
        .attr("cx", heightUnit / 2)
        .attr("cy", heightUnit + heightUnit / 2)
        .attr("r", function () {
          return heightUnit / 2;
        })
        .style('fill', 'none')
        .style("stroke", '#000');

    // 绘制第二个圈圈, 如果是过信号机那种不用绘制
    grid.append('circle')
        .attr("cx", heightUnit / 2)
        .attr("cy", 0)
        .attr("r", function () {
          return heightUnit / 2;
        })
        .style('fill', 'none')
        .style("stroke", function (d) {
          if (d.value.seamaphoreState === 'pass') {
            return '#fff';
          } else {
            return '#000';
          }
        });

    grid.append('text')
        .attr("x", heightUnit)
        .attr("y", heightUnit * 3)
        .attr("dy", ".35em")
        .text(function (d) {
          var data = d.value;
          if (data.seamaphoreState === 'in') {
            return data.stationName;
          } else if (data.seamaphoreState === 'out') {
            return '出站';
          } else if (data.seamaphoreState === 'notice') {
            return '进站';
          } else {
            return data.seamaphoreNo;
          }

        });
  }

  /**
   * 绘制 x 轴
   */
  function drawXAxis(xAxisOffset) {
    svg.select('g.axis').remove();

    var xAxis = d3.svg.axis()
        .scale(x)
        .orient("bottom")
        .tickFormat(function (d, i) {
          if (d >= dataArray.length) {
            return '';
          }
          if (d == 0) {
            return firstDateLabelFormat(dataArray[d].date);
          } else {
            return dateLabelFormat(dataArray[d].date);
          }
        });

    svg.append("g")
        .attr("class", "axis")
        .attr("transform", "translate(" + margin.left + "," + xAxisOffset + ")")
        .call(xAxis);
  }

  /**
   * 详情部分布局
   * @param chartHeight 图表部分计算出来的高度
   */
  function layoutDetail(chartHeight) {
    // 工具栏固定, 图表高度固定, 底栏footer高度固定, 剩余的就是信息详情的高度
    var availableHeight = $(window).innerHeight() - $('#toolbar').outerHeight() - chartHeight - $(
            '#footer').outerHeight();
    availableHeight = availableHeight > minDetailHeight ? availableHeight : minDetailHeight;

    availableHeight -= ieFix; // ie 下面有点滚动条问题

    $('#detail').outerHeight(availableHeight);
  }

  /**
   * 计算图表的大小, 根据容器大小自适应
   * @returns {{width: *, height: number}} 图表的大小
   */
  function calcChartSize() {
    var boxWidth, box = d3.select("#chart").node().getBoundingClientRect();
    if (!box.width) {
      boxWidth = box.width;
    } else {
      boxWidth = box.right - box.left;
    }

    return {
      width: boxWidth,
      height: Math.floor(boxWidth / aspectRatio)
    }
  }

  /**
   * 生成测试用数据
   * @returns {Array}
   */
  function generateTestData() {
    var startDate = new Date().getTime() - 1000 * 60 * 60;
    var dataArray = [];
    var voltageRandom = 0, lampRandom = 0, carrierFrequencyRandom = 0, lowFrequencyRandom = 0,
        insulationRandom = 0, upDownRandom = 0, abRandom = 0, port12Random = 0;
    var seamaphoreState = 'pass';
    var seamaphoreRandom = Math.round(Math.random() * 6); // 每隔几个信号机来一个进站出站
    var seamaphoreNo = Math.round(Math.random() * 50 + 200); // 随机来个开始信号机号码
    var stationNames = [
      '温州',
      '青田',
      '丽水',
      '缙云',
      '永康',
      '武义',
      '金华',
      '义乌',
      '诸暨',
      '杭州',
      '德清西',
      '长兴南',
      '宣城',
      '芜湖',
      '巢湖',
      '合肥',
      '淮南',
      '阜阳',
      '亳州',
      '商丘南',
      '定陶',
      '菏泽',
      '梁山',
      '阳谷',
      '聊城',
      '临清',
      '清河城',
      '枣强',
      '衡水',
      '辛集',
      '石家庄北',
      '太原'
    ];
    var startStationNameIndex = Math.round(Math.random() * stationNames.length); // 开始站名
    var seamaphoreStateRandom = 0;
    var stationName = '无此站名';

    function nextStation() {
      startStationNameIndex++;
      if (startStationNameIndex >= stationNames.length) {
        startStationNameIndex = 0;
      }
      stationName = stationNames[startStationNameIndex];
    }

    function nextSeamaphore() {
      seamaphoreNo += Math.round(Math.random() * 10);
    }

    function pushNewData() {
      var lastData = dataArray[dataArray.length - 1];
      var lamp = '' + Math.round(Math.random()) + Math.round(Math.random()) + Math.round(
              Math.random())
                 + Math.round(Math.random()) + Math.round(Math.random()) + Math.round(
              Math.random());

      if (lampRandom == 0) {
        lampRandom = Math.round(Math.random() * 10 + 5);
        lamp = '' + Math.round(Math.random()) + Math.round(Math.random()) + Math.round(
                Math.random())
               + Math.round(Math.random()) + Math.round(Math.random()) + Math.round(
                Math.random());
      } else {
        lamp = lastData.lamp;
        lampRandom -= 1;
      }

      var voltage = Math.round(Math.random() * 600 + voltageRandom * 2 + 300);
      voltageRandom += Math.round(Math.random() * 20);
      if (voltageRandom > 500) {
        voltageRandom = 0;
      }

      var carrierFrequency;
      if (carrierFrequencyRandom == 0) {
        carrierFrequencyRandom = Math.round(Math.random() * 18);
        carrierFrequency = Math.round(Math.random() * 2900);
      } else {
        carrierFrequency = lastData.carrierFrequency;
        carrierFrequencyRandom -= 1;
      }

      var lowFrequency;
      if (lowFrequencyRandom == 0) {
        lowFrequencyRandom = Math.round(Math.random() * 20);
        lowFrequency = Math.round(Math.random() * 3 + 9);
      } else {
        lowFrequency = lastData.lowFrequency;
        lowFrequencyRandom -= 1;
      }

      // 信号机, 每隔 n 个 pass, 来一个 notice, in, out, 然后再重复
      if (seamaphoreStateRandom == 0) {
        if (seamaphoreState === 'pass') {
          if (seamaphoreRandom == 0) {
            seamaphoreState = 'notice';
          } else {
            seamaphoreRandom -= 1;
          }

          nextSeamaphore();
        } else if (seamaphoreState === 'notice') {
          seamaphoreState = 'in';
          nextSeamaphore();
          nextStation();
        } else if (seamaphoreState === 'in') {
          seamaphoreState = 'out';
          nextSeamaphore();
        } else if (seamaphoreState === 'out') {
          seamaphoreState = 'pass';
          seamaphoreRandom = Math.round(Math.random() * 6);
          nextSeamaphore();
        }

        seamaphoreStateRandom = Math.round(Math.random() * 30 + 60);
      } else {
        seamaphoreStateRandom -= 1;
      }

      var upDown;
      if (upDownRandom == 0) {
        upDownRandom = Math.round(Math.random() * 50);
        upDown = Math.round(Math.random());
      } else {
        upDown = lastData.upDown;
        upDownRandom -= 1;
      }

      var insulation;
      if (insulationRandom == 0) {
        insulationRandom = Math.round(Math.random() * 60);
        insulation = Math.round(Math.random());
      } else {
        insulation = lastData.insulation;
        insulationRandom -= 1;
      }

      var ab;
      if (abRandom == 0) {
        abRandom = Math.round(Math.random() * 120);
        ab = Math.round(Math.random());
      } else {
        ab = lastData.ab;
        abRandom -= 1;
      }

      var port12;
      if (port12Random == 0) {
        port12Random = Math.round(Math.random() * 100);
        port12 = Math.round(Math.random());
      } else {
        port12 = lastData.port12;
        port12Random -= 1;
      }

      dataArray.push({
                       lamp: lamp,
                       voltage: voltage,
                       carrierFrequency: carrierFrequency,
                       lowFrequency: lowFrequency,
                       stationName: stationName,
                       seamaphoreNo: seamaphoreNo,
                       seamaphoreState: seamaphoreState,
                       upDown: upDown,
                       insulation: insulation,
                       ab: ab,
                       port12: port12,
                       date: lastData ? new Date(lastData.date.getTime() + 1000) : new Date(startDate)
                     });
    }

    for (var i = 0; i < 20; i++) {
      pushNewData();
    }

    // 然后定期生产数据进入 dataArray
    setInterval(function () {
      for (var i = 0; i < 20; i++) {
        pushNewData();
      }
      if (dataArray.length > xAxisMax + 1) {
        dataArray.splice(0, dataArray.length - xAxisMax - 1);
      }
      update(); // 重新绘制图表
    }, 2000);

    return dataArray;
  }

  function adjustX(x) {
    var minWidth = width / xAxisMax;
    var adjust = x % minWidth;
    return adjust > minWidth / 2 ? x + minWidth - adjust : x - adjust;
  }
});