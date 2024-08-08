import classes from './Dashboard.module.css';
import { Container } from '@mantine/core';
import '../../assets/Global.css';

function Dashboard() {
  return (
    <>
      <header className={classes.header}>
        <Container
          size="xl"
          className={classes.inner}
          style={{ marginLeft: '60px', height: '96px', width: '1380px' }}
        >
          <div>
            <h1>Dashboard</h1>
          </div>
          {/* TO:DO how to use icons from google fonts */}
          <div className="icon download"></div>
          <div className="icon search"></div>
        </Container>
      </header>
    </>
  );
}
export default Dashboard;
