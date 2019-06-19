var twist;
var cmdVel;
var publishImmiediately = true;
var robot_IP;
var manager;
var teleop;
var ros;


/*
* function to send ROS messages with velocity for robot:
*/
function moveAction(linear, angular) {
  if (linear !== undefined && angular !== undefined) {
    twist.linear.x = linear;
    twist.angular.z = angular;
  } else {
    twist.linear.x = 0;
    twist.angular.z = 0;
  }
  cmdVel.publish(twist);
}

/*
* function to create velocity message publisher:
*/
function initVelocityPublisher() {
  // Init message w/ zero values.
  twist = new ROSLIB.Message({
    linear: {
      x: 0,
      y: 0,
      z: 0
    },
    angular: {
      x: 0,
      y: 0,
      z: 0
    }
  });
  // Init topic object
  cmdVel = new ROSLIB.Topic({
    ros: ros,
    name: '/cmd_vel',
    messageType: 'geometry_msgs/Twist'
  });
  // Register publisher w/in ROS system
  cmdVel.advertise();
}

/*
* function to create keyboard controller object:
*/
function initTeleopKeyboard() {
  // Use w, s, a, d keys to drive ya robot!

  // Check if keyboard controller was already created
  if (teleop == null) {
    // Initialize the teleop
    teleop = new KEYBOARDTELEOP.Teleop({
      ros: ros,
      topic: '/cmd_vel'
    });
  }

  // Add event listener for slider moves
  robotSpeedRange = document.getElementById('robot-speed');
  robotSpeedRange.oninput = function () {
    teleop.scale = robotSpeedRange.value / 100
  }
}

/* 
* function to create joystick object:
*/
function createJoystick() {
  // Check if joystick was already created
  if (manager == null) {
    joystickContainer = document.getElementById('joystick');
    // joystick configuration, if you want to adjust joystick, refer to
    // https://yoannmoinet.github.io/nipplejs
    var options = {
      zone: joystickContainer,
      position: { left: 50 + '%', top: 105 + 'px' },
      mode: 'static',
      size: 200,
      color: '#6AEB22', //'#0066ff',
      restJoystick: true
    };
    manager = nipplejs.create(options);
    // event listener for joystick move
    manager.on('move', function (evt, nipple) {
      // nipplejs returns direction is screen coordiantes
      // we need to rotate it, that dragging towards screen top will move robot forward
      var direction = nipple.angle.degree - 90;
      if (direction > 180) {
        direction = -(450 - nipple.angle.degree);
      }
      // convert angles to radians and scale linear and angular speed
      // adjust if youwant robot to drvie faster or slower
      var lin = Math.cos(direction / 57.29) * nipple.distance * 0.005;
      var ang = Math.sin(direction / 57.29) * nipple.distance * 0.05;
      // nipplejs is triggering events when joystic moves each pixel
      // we need delay between consecutive messege publications to 
      // prevent system from being flooded by messages
      // events triggered earlier than 50ms after last publication will be dropped 
      if (publishImmidiately) {
        publishImmidiately = false;
        moveAction(lin, ang);
        setTimeout(function () {
          publishImmidiately = true;
        }, 50);
      }
    });
    // event litener for joystick release, always send stop message
    manager.on('end', function () {
      moveAction(0, 0);
    });
  }
}

// main app initialization:
window.onload = function () {
  /* Choose between static IP address for the robot or dynamically defined IP with location.hostname depending on your configuration. If the web server is running on a device different than the robot, IP must be set manually to the robot address. If the app is deployed to a server which is running on your robot, it can be set automatically.
  */
  // determine robot address automatically
  robot_IP = location.hostname;
  // set robot address statically
  // robot_IP = "10.5.10.117";

  // // Init handle for rosbridge_websocket
  ros = new ROSLIB.Ros({
    url: "ws://" + robot_IP + ":9090"
  });

  initVelocityPublisher();
  // get handle for video placeholder
  video = document.getElementById('video');
  // Populate video source 
  video.src = "http://" + robot_IP + ":8080/stream?topic=/camera/rgb/image_raw&type=mjpeg&quality=80";
  video.onload = function () {
    // joystick and keyboard controls will be available only when video is correctly loaded
    createJoystick();
    initTeleopKeyboard();
  };
}