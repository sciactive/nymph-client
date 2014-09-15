<?php

require 'lib/require.php';
$require = new RequirePHP();

require 'src/Nymph.php';
$require('NymphConfig', array(), function(){
	return include 'conf/config.php';
});

$NymphREST = $require('NymphREST');

require 'examples/Employee.php';
require 'examples/Todo.php';

if (in_array($_SERVER['REQUEST_METHOD'], array('PUT', 'DELETE'))) {
	parse_str(file_get_contents("php://input"), $args);
	$NymphREST->run($_SERVER['REQUEST_METHOD'], $args['action'], $args['data']);
} else {
	$NymphREST->run($_SERVER['REQUEST_METHOD'], $_REQUEST['action'], $_REQUEST['data']);
}
